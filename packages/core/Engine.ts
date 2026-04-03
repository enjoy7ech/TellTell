import { ISerializable, StoryEventNode, NodeId, Action, TriggerRequirement } from './Types';
import { CharacterManager } from './CharacterManager';
import { MapManager } from './MapManager';
import { DateTimeManager } from './DateTime';

/**
 * Pure Engine Logic (UI Agnostic)
 */
export interface RuntimeNode {
    node: StoryEventNode;
    inDegree: number;
}

export interface SaveData {
    meta: { time: number; passedNodes: NodeId[]; inDegrees: { id: NodeId; inDegree: number }[]; };
    modules: { [key: string]: any };
}

export interface EngineConfig {
    storyUrl?: string;
    configUrl?: string;
}

export class Engine {
    private nodeMap: Map<NodeId, StoryEventNode> = new Map();
    private nodes: RuntimeNode[] = [];
    private instances: (ISerializable & { id?: string })[] = [];
    private passedNodes: Set<NodeId> = new Set();
    public activeNodes: RuntimeNode[] = [];
    private initialized: boolean = false;
    private currentNode: StoryEventNode | null = null;
    private currentFrameIndex: number = -1;

    // Event Handling
    private listeners: { [key: string]: Function[] } = {};

    constructor(private config: EngineConfig = {}) {
        this.config.storyUrl = this.config.storyUrl || '/assets/data/bundle_story.json';
        this.config.configUrl = this.config.configUrl || '/assets/data/gameConfig.json';
    }

    public async init(): Promise<void> {
        try {
            this.registerModule(new CharacterManager());
            this.registerModule(new MapManager());
            this.registerModule(new DateTimeManager());

            const configResp = await fetch(this.config.configUrl!);
            const engineConfig = await configResp.json();

            if (engineConfig.plugins) {
                await this.loadPlugins(engineConfig.plugins);
            }

            const response = await fetch(this.config.storyUrl!);
            const storyData: { nodes: StoryEventNode[], characters?: any[] } = await response.json();
            this.buildDAG(storyData.nodes);

            if (storyData.characters) {
                const charMgr = this.getModule('Character');
                if (charMgr && typeof charMgr.initCharacters === 'function') {
                    charMgr.initCharacters(storyData.characters);
                }
            }

            this.initialized = true;
            this.emit('initialized', engineConfig);
        } catch (error) {
            console.error("[Engine] Init failed:", error);
        }
    }

    public registerModule(instance: any): void {
        this.instances.push(instance);
        if (typeof (instance as any).bindEngine === 'function') {
            (instance as any).bindEngine(this);
        }
    }

    public async startStoryNode(nodeId: NodeId): Promise<void> {
        this.currentNode = this.nodeMap.get(nodeId) || null;
        this.currentFrameIndex = 0;
        if (this.currentNode) {
            await this.executeActions(this.currentNode.mount);
            this.renderCurrentFrame();
        }
    }

    public async playNext(): Promise<void> {
        if (!this.initialized) await this.init();
        if (!this.currentNode) {
            this.updateActiveNodes();
            if (this.activeNodes.length > 0) {
                this.currentNode = this.activeNodes[0].node;
                this.currentFrameIndex = 0;
                await this.executeActions(this.currentNode.mount);
            } else { this.emit('end', {}); return; }
        } else if (this.currentFrameIndex >= this.currentNode.display.length - 1) {
            const completedId = this.currentNode.id;
            await this.executeActions(this.currentNode.unMount);
            await this.step(completedId);
            if (this.activeNodes.length > 0) {
                this.currentNode = this.activeNodes[0].node;
                this.currentFrameIndex = 0;
                await this.executeActions(this.currentNode.mount);
            } else {
                this.currentNode = null;
                this.currentFrameIndex = -1;
                this.emit('end', {});
                return;
            }
        } else {
            this.currentFrameIndex++;
        }
        await this.renderCurrentFrame();
    }

    private async renderCurrentFrame() {
        if (!this.currentNode) return;
        const frame = this.currentNode.display[this.currentFrameIndex];
        if (!frame) return;
        
        await this.executeActions(frame.pre);
        this.emit('render', frame);
        await this.executeActions(frame.post);
    }

    public on(event: string, cb: Function) {
        if (!this.listeners[event]) this.listeners[event] = [];
        this.listeners[event].push(cb);
    }

    private emit(event: string, data: any) {
        if (this.listeners[event]) {
            this.listeners[event].forEach(cb => cb(data));
        }
    }

    // Logic Methods (Build DAG, Actions, Triggers etc.)
    private buildDAG(nodes: StoryEventNode[]): void {
        this.nodeMap.clear();
        this.nodes = [];
        nodes.forEach(node => {
            this.nodeMap.set(node.id, node);
            this.nodes.push({ node, inDegree: 0 });
        });
        nodes.forEach(node => {
            if (node.postNodes) {
                node.postNodes.forEach(targetId => {
                    const target = this.nodes.find(n => n.node.id === targetId);
                    if (target) target.inDegree++;
                });
            }
        });
    }

    public async step(completedNodeId: NodeId): Promise<void> {
        if (!this.initialized) return;
        const node = this.nodeMap.get(completedNodeId);
        if (node && node.postNodes) {
            node.postNodes.forEach(targetId => {
                const target = this.nodes.find(n => n.node.id === targetId);
                if (target) target.inDegree--;
            });
            this.passedNodes.add(completedNodeId);
        }
        this.updateActiveNodes();
    }

    private updateActiveNodes(): void {
        this.activeNodes = this.nodes
            .filter(n => n.inDegree === 0 && !this.passedNodes.has(n.node.id))
            .filter(n => this.checkTriggers(n.node.triggers));
        this.activeNodes.sort((a, b) => (b.node.priority || 0) - (a.node.priority || 0));
    }

    private checkTriggers(triggers?: TriggerRequirement[]): boolean {
        if (!triggers || triggers.length === 0) return true;
        for (const req of triggers) {
            const module = this.getModule(req.module);
            if (module && typeof (module as any)[req.func] === 'function') {
                if (!(module as any)[req.func](...req.params)) return false;
            }
        }
        return true;
    }

    public async executeActions(actions?: Action[]): Promise<void> {
        if (!actions) return;
        for (const action of actions) {
            const module = this.getModule(action.module);
            if (module && typeof (module as any)[action.func] === 'function') {
                await (module as any)[action.func](...action.params);
            }
        }
    }

    public getModule(name: string): any {
        if (name === 'Engine') return this;
        return this.instances.find(inst => inst.id === name || inst.constructor.name === name);
    }

    /**
     * 动态加载插件系统 (仅限打包后的 JS 模块)
     */
    private async loadPlugins(plugins: any[]): Promise<void> {
        try {
            const pluginRegistry: { [key: string]: () => Promise<any> } = {
                'mobile': async () => (await import('@telltell/plugin-mobile')).PhoneSystem,
            };
            for (const p of plugins) {
                const pluginId = typeof p === 'string' ? p : p.id;
                const loadFn = pluginRegistry[pluginId];
                if (loadFn) {
                    const PluginClass = await loadFn();
                    this.registerModule(new PluginClass());
                }
            }
        } catch (e) {
            console.error("[Engine] Plugin loading failed:", e);
        }
    }

    public saveGame(): SaveData {
        const data: SaveData = { meta: { time: Date.now(), passedNodes: Array.from(this.passedNodes), inDegrees: this.nodes.map(n => ({ id: n.node.id, inDegree: n.inDegree })) }, modules: {} };
        this.instances.forEach(inst => {
            const name = inst.id || inst.constructor.name;
            data.modules[name] = inst.save();
        });
        localStorage.setItem('TellTell_Save_TS', JSON.stringify(data));
        return data;
    }

    public loadGame(saveData: SaveData): void {
        this.passedNodes = new Set(saveData.meta.passedNodes);
        saveData.meta.inDegrees.forEach(idState => {
            const target = this.nodes.find(n => n.node.id === idState.id);
            if (target) target.inDegree = idState.inDegree;
        });
        this.instances.forEach(inst => {
            const name = inst.id || inst.constructor.name;
            if (saveData.modules[name]) inst.load(saveData.modules[name]);
        });
        this.updateActiveNodes();
    }
}
