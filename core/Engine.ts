import { ISerializable, StoryEventNode, NodeId, Action, TriggerRequirement } from './Types';

/**
 * TellTell 核心引擎 (TypeScript 版)
 */
export interface RuntimeNode {
    node: StoryEventNode;
    inDegree: number;
}

export interface SaveData {
    meta: {
        time: number;
        passedNodes: NodeId[];
        inDegrees: { id: NodeId; inDegree: number }[];
    };
    modules: { [key: string]: any };
}

export interface EngineConfig {
    storyUrl: string;
}

export class Engine {
    private nodeMap: Map<NodeId, StoryEventNode> = new Map();
    private nodes: RuntimeNode[] = [];
    private instances: (ISerializable & { id?: string })[] = [];
    private passedNodes: Set<NodeId> = new Set();
    public activeNodes: RuntimeNode[] = [];
    private initialized: boolean = false;

    constructor(private config: EngineConfig) {}

    /**
     * 注册子系统或插件实例
     */
    public registerModule(instance: ISerializable & { id?: string }): void {
        this.instances.push(instance);
    }

    /**
     * 初始化引擎，读取剧情文件并构建 DAG
     */
    public async init(): Promise<void> {
        try {
            const response = await fetch(this.config.storyUrl);
            const storyData: { nodes: StoryEventNode[] } = await response.json();
            this.buildDAG(storyData.nodes);
            this.initialized = true;
            console.log("TellTell Engine (TS) Initialized.");
        } catch (error) {
            console.error("Failed to initialize engine:", error);
        }
    }

    /**
     * 构建 DAG 入度图
     */
    private buildDAG(nodes: StoryEventNode[]): void {
        this.nodeMap.clear();
        this.nodes = [];

        // 1. 初始化
        nodes.forEach(node => {
            this.nodeMap.set(node.id, node);
            this.nodes.push({ node, inDegree: 0 });
        });

        // 2. 计算入度
        nodes.forEach(node => {
            if (node.postNodes) {
                node.postNodes.forEach(targetId => {
                    const target = this.nodes.find(n => n.node.id === targetId);
                    if (target) target.inDegree++;
                });
            }
        });
    }

    /**
     * 推进剧情：入度减一并更新可用节点
     */
    public async step(completedNodeId: NodeId): Promise<void> {
        if (!this.initialized) return;

        const node = this.nodeMap.get(completedNodeId);
        if (node && node.postNodes) {
            node.postNodes.forEach(targetId => {
                const target = this.nodes.find(n => n.node.id === targetId);
                if (target) {
                    target.inDegree--;
                }
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
        console.log("Active nodes:", this.activeNodes.map(n => n.node.id));
    }

    /**
     * 条件检查逻辑
     */
    private checkTriggers(triggers?: TriggerRequirement[]): boolean {
        if (!triggers || triggers.length === 0) return true;
        
        for (const req of triggers) {
            try {
                const module = this.getModule(req.module);
                if (module && typeof (module as any)[req.func] === 'function') {
                    if (!(module as any)[req.func](...req.params)) return false;
                }
            } catch (e) {
                console.warn(`Trigger failed: ${req.module}.${req.func}`, e);
                return false; 
            }
        }
        return true;
    }

    /**
     * 执行 Action
     */
    public async executeActions(actions?: Action[]): Promise<void> {
        if (!actions) return;
        for (const action of actions) {
            try {
                const module = this.getModule(action.module);
                if (module && typeof (module as any)[action.func] === 'function') {
                    await (module as any)[action.func](...action.params);
                }
            } catch (e) {
                console.error(`Action failed: ${action.module}.${action.func}`, e);
            }
        }
    }

    private getModule(name: string): any {
        if (name === 'Engine') return this;
        return this.instances.find(inst => inst.id === name || inst.constructor.name === name);
    }

    /**
     * 存档
     */
    public saveGame(): SaveData {
        const data: SaveData = {
            meta: {
                time: Date.now(),
                passedNodes: Array.from(this.passedNodes),
                inDegrees: this.nodes.map(n => ({ id: n.node.id, inDegree: n.inDegree })),
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

    /**
     * 读档
     */
    public loadGame(saveData: SaveData): void {
        this.passedNodes = new Set(saveData.meta.passedNodes);
        
        saveData.meta.inDegrees.forEach(idState => {
            const target = this.nodes.find(n => n.node.id === idState.id);
            if (target) target.inDegree = idState.inDegree;
        });

        this.instances.forEach(inst => {
            const name = inst.id || inst.constructor.name;
            if (saveData.modules[name]) {
                inst.load(saveData.modules[name]);
            }
        });

        this.updateActiveNodes();
    }
}
