import { ISerializable, StoryEventNode, NodeId, Action, TriggerRequirement } from './Types';
import { CharacterManager } from './CharacterManager';
import { MapManager } from './MapManager';
import { DateTimeManager } from './DateTime';

/**
 * Pure Engine Logic (UI Agnostic)
 */
export interface RuntimeNode {
    node: StoryEventNode;
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
    private inDegreeMap: Map<number, RuntimeNode[]> = new Map();
    private nodeInDegree: Map<NodeId, number> = new Map();
    private nodes: RuntimeNode[] = [];
    private instances: (ISerializable & { id?: string })[] = [];
    private passedNodes: Set<NodeId> = new Set();
    public activeNodes: RuntimeNode[] = [];
    private initialized: boolean = false;
    public currentNode: StoryEventNode | null = null;
    private currentFrameIndex: number = -1;

    // Event Handling
    private listeners: { [key: string]: Function[] } = {};

    constructor(private config: EngineConfig = {}) {
        this.config.storyUrl = this.config.storyUrl || '/data/bundle_story.json';
        this.config.configUrl = this.config.configUrl || '/data/gameConfig.json';
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

    /**
     * Helper: Get character display name from modules (checks for knowledge)
     */
    public getCharacterName(charId: string): string {
        const charMgr = this.getModule('Character');
        if (!charId) return "";
        if (charMgr && typeof charMgr.getCharacter === 'function') {
            const profile = charMgr.getCharacter(charId);
            const protagonist = charMgr.getProtagonist();

            // 1. If it is the protagonist themselves, they know their name
            if (profile?.isProtagonist) return profile.name || charId;

            // 2. If it is an NPC, check if the protagonist knows their name
            if (protagonist?.knowledge) {
                const kMap = (protagonist.knowledge as any).get ? protagonist.knowledge.get(charId) : (protagonist.knowledge as any)[charId];
                if (kMap && kMap.name) {
                    return profile?.name || charId;
                }
            }
            return "?"; // Name unknown
        }
        return charId;
    }

    public registerModule(instance: any): void {
        this.instances.push(instance);
        if (typeof (instance as any).bindEngine === 'function') {
            (instance as any).bindEngine(this);
        }
    }

    public judgeSatisfy(requirements: TriggerRequirement[]): boolean {
        for (const req of requirements) {
            const module = this.getModule(req.module);
            if (module && typeof (module as any)[req.func] === 'function') {
                if (!(module as any)[req.func](...req.params)) return false;
            }
        }
        return true;
    }

    /**
    #DEFINE_UI_FUNCTION
    @description 启动指定的剧情节点
    @type action
    @module Engine 引擎核心
    @param nodeId 节点ID | unit:StoryNodeSelect
    @returns Promise<void>
    #END_DEFINE_UI_FUNCTION
    */
    public async startStoryNode(nodeId: NodeId): Promise<void> {
        if (!this.initialized) await this.init();
        const cleanId = String(nodeId).trim();
        this.currentNode = this.nodeMap.get(cleanId) || null;
        this.currentFrameIndex = -1;

        if (this.currentNode) {
            await this.internalStep(this.currentNode.id);
            await this.executeActions(this.currentNode.mount);
            await this.renderCurrentFrame();
        }
    }

    /**
    #DEFINE_UI_FUNCTION
    @description 推进至下一段剧情（集合切页与自动跳转）
    @type action
    @module Engine 引擎核心
    @returns Promise<void>
    #END_DEFINE_UI_FUNCTION
    */
    public async next(): Promise<void> {
        if (!this.initialized) await this.init();

        // 场景 A：当前没有节点，或者当前节点点到了头 -> 抽取下一个可用节点
        if (!this.currentNode || this.currentFrameIndex >= this.currentNode.display.length - 1) {
            if (this.currentNode) {
                await this.executeActions(this.currentNode.unMount);
                this.currentNode = null;
                this.currentFrameIndex = -1;
            }

            this.updateActiveNodes(); // 刷新就绪池

            if (this.activeNodes.length > 0) {
                const nextRN = this.activeNodes[0];
                this.currentNode = nextRN.node;
                this.currentFrameIndex = 0;

                await this.internalStep(this.currentNode.id); // 到达即满足
                await this.executeActions(this.currentNode.mount);
            } else {
                this.emit('end', {});
                return;
            }
        }
        // 场景 B：还在当前节点内 -> 切分页
        else {
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

    private buildDAG(nodes: StoryEventNode[]): void {
        this.nodeMap.clear();
        this.inDegreeMap.clear();
        this.nodeInDegree.clear();
        this.nodes = [];
        this.passedNodes.clear();
        this.activeNodes = [];
        this.currentNode = null;
        this.currentFrameIndex = -1;

        // 1. First pass: Register all nodes
        nodes.forEach(node => {
            const cleanId = String(node.id).trim();
            node.id = cleanId;
            this.nodeMap.set(cleanId, node);
            this.nodeInDegree.set(cleanId, 0);
            this.nodes.push({ node });
        });

        // 2. Second pass: Calculate in-degrees
        nodes.forEach(node => {
            if (node.postNodes) {
                node.postNodes.forEach(targetId => {
                    const cleanTargetId = String(targetId).trim();
                    const currentDeg = this.nodeInDegree.get(cleanTargetId) || 0;
                    this.nodeInDegree.set(cleanTargetId, currentDeg + 1);
                });
            }
        });

        // 3. Populate Buckets
        this.nodes.forEach(rn => {
            const deg = this.nodeInDegree.get(rn.node.id) || 0;
            if (!this.inDegreeMap.has(deg)) this.inDegreeMap.set(deg, []);
            this.inDegreeMap.get(deg)!.push(rn);
        });

        // 4. Initial Active Nodes: Those in Bucket 0
        const bucket0 = this.inDegreeMap.get(0) || [];
        this.activeNodes = bucket0.filter(n => this.checkTriggers(n.node.triggers));
        this.activeNodes.sort((a, b) => (b.node.priority || 0) - (a.node.priority || 0));

        console.log(`[Engine] DAG Initialized. Active:`, this.activeNodes.map(n => n.node.id));
    }

    private moveNodeBetweenBuckets(nodeId: NodeId, from: number, to: number) {
        const fromBucket = this.inDegreeMap.get(from);
        if (fromBucket) {
            const idx = fromBucket.findIndex(n => n.node.id === nodeId);
            if (idx !== -1) {
                const node = fromBucket.splice(idx, 1)[0];
                if (!this.inDegreeMap.has(to)) this.inDegreeMap.set(to, []);
                this.inDegreeMap.get(to)!.push(node);
            }
        }
    }

    private async internalStep(completedNodeId: NodeId): Promise<void> {
        const cleanId = completedNodeId.trim();
        if (this.passedNodes.has(cleanId)) return;

        const node = this.nodeMap.get(cleanId);
        this.passedNodes.add(cleanId);

        // Evict from bucket 0 and active list
        const bucket0 = this.inDegreeMap.get(0);
        if (bucket0) {
            this.inDegreeMap.set(0, bucket0.filter(n => n.node.id !== cleanId));
        }
        this.activeNodes = this.activeNodes.filter(n => n.node.id !== cleanId);

        // Update downstream
        if (node && node.postNodes) {
            node.postNodes.forEach(targetId => {
                const cleanTargetId = String(targetId).trim();
                const currentDeg = this.nodeInDegree.get(cleanTargetId) || 0;
                if (currentDeg > 0) {
                    const newDeg = currentDeg - 1;
                    this.nodeInDegree.set(cleanTargetId, newDeg);
                    this.moveNodeBetweenBuckets(cleanTargetId, currentDeg, newDeg);

                    if (newDeg === 0) {
                        const target = this.nodes.find(n => n.node.id === cleanTargetId);
                        if (target && this.checkTriggers(target.node.triggers)) {
                            if (!this.activeNodes.find(an => an.node.id === target.node.id)) {
                                this.activeNodes.push(target);
                            }
                        }
                    }
                }
            });
        }

        this.logProgress(cleanId);
    }

    private logProgress(nodeId: NodeId) {
        console.group(`[Engine] Narrative Progress: ${nodeId} ✅`);
        console.log(`Passed: ${this.passedNodes.size} / Total: ${this.nodes.length}`);

        const bucketStats = Array.from(this.inDegreeMap.entries())
            .filter(([_, list]) => list.length > 0)
            .sort(([a], [b]) => a - b)
            .map(([deg, list]) => `Deg[${deg}]: ${list.length}`);
        console.log(`Topol: ${bucketStats.join(' | ')}`);

        if (this.activeNodes.length > 0) {
            console.log(`Pool: ${this.activeNodes.map(n => n.node.id).join(', ')}`);
            console.log(`Next: %c${this.activeNodes[0].node.id}`, 'color: #3b82f6; font-weight: 800;');
        }
        console.groupEnd();
    }

    private updateActiveNodes(): void {
        // Find all nodes that are at inDegree 0 and not passed
        const ready = this.nodes
            .filter(n => (this.nodeInDegree.get(n.node.id) || 0) <= 0 && !this.passedNodes.has(n.node.id))
            .filter(n => this.checkTriggers(n.node.triggers));

        ready.sort((a, b) => (b.node.priority || 0) - (a.node.priority || 0));
        this.activeNodes = ready;
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

    /**
    #DEFINE_UI_FUNCTION
    @description 执行即时存档 (保存当前游戏状态)
    @type action
    @module Engine 引擎核心
    @returns any
    #END_DEFINE_UI_FUNCTION
    */
    public saveGame(): SaveData {
        const data: SaveData = {
            meta: {
                time: Date.now(),
                passedNodes: Array.from(this.passedNodes),
                inDegrees: Array.from(this.nodeInDegree.entries()).map(([id, deg]) => ({ id, inDegree: deg }))
            },
            modules: {}
        };
        this.instances.forEach(inst => {
            const name = inst.id || inst.constructor.name;
            data.modules[name] = inst.save();
        });
        localStorage.setItem('TellTell_Save_TS', JSON.stringify(data));
        return data;
    }

    public loadGame(saveData: SaveData): void {
        this.passedNodes = new Set(saveData.meta.passedNodes);
        this.nodeInDegree.clear();
        this.inDegreeMap.clear();

        saveData.meta.inDegrees.forEach(idState => {
            const deg = idState.inDegree;
            this.nodeInDegree.set(idState.id, deg);

            const target = this.nodes.find(n => n.node.id === idState.id);
            if (target) {
                if (!this.inDegreeMap.has(deg)) this.inDegreeMap.set(deg, []);
                this.inDegreeMap.get(deg)!.push(target);
            }
        });

        this.instances.forEach(inst => {
            const name = inst.id || inst.constructor.name;
            if (saveData.modules[name]) inst.load(saveData.modules[name]);
        });
        this.updateActiveNodes();
    }

    /**
    #DEFINE_UI_FUNCTION
    @description 永远不会自然进入的节点
    @type judge
    @module Engine 引擎核心
    @returns boolean
    #END_DEFINE_UI_FUNCTION
        */
    public isNeverStepNode(): boolean {
        return false
    }
}
