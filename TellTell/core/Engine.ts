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

    // --- 运行状态 ---
    private activeNodeId: NodeId | null = null;
    private currentFrameIndex: number = 0;

    constructor(private config: EngineConfig) {}

    public registerModule(instance: ISerializable & { id?: string }): void {
        this.instances.push(instance);
    }

    public async init(): Promise<void> {
        try {
            const response = await fetch(this.config.storyUrl);
            const data = await response.json();
            const nodes: StoryEventNode[] = data.nodes || [];
            this.buildDAG(nodes);
            this.initialized = true;
            console.log("TellTell Engine Ready.");
        } catch (error) {
            console.error("Engine Init Failed:", error);
        }
    }

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

    /**
     * 【核心分发器】统一推进步伐
     */
    public async playNext(): Promise<void> {
        if (!this.initialized) return;

        // 1. 如果当前没有正在播放的节点，尝试从 activeNodes 中挑选一个进入
        if (!this.activeNodeId) {
            this.updateActiveNodes();
            if (this.activeNodes.length > 0) {
                await this.enterNode(this.activeNodes[0].node.id);
            } else {
                console.log("[Engine] Waiting for user action or state change...");
            }
            return;
        }

        // 2. 如果正在节点内，推进帧
        const node = this.nodeMap.get(this.activeNodeId);
        if (!node) return;

        // 执行当前帧的 post
        const currentFrame = node.display[this.currentFrameIndex];
        if (currentFrame?.post) await this.executeActions(currentFrame.post);

        this.currentFrameIndex++;

        // 检查是否超出帧范围
        if (this.currentFrameIndex >= node.display.length) {
            await this.finishNode();
        } else {
            // 继续下一帧
            const nextFrame = node.display[this.currentFrameIndex];
            if (nextFrame?.pre) await this.executeActions(nextFrame.pre);
            this.render();
        }
    }

    private async enterNode(nodeId: NodeId) {
        const node = this.nodeMap.get(nodeId);
        if (!node) return;

        this.activeNodeId = nodeId;
        this.currentFrameIndex = 0;

        // Mount 事件
        if (node.mount) await this.executeActions(node.mount);

        // 第一帧 Pre 事件
        const firstFrame = node.display[0];
        if (firstFrame?.pre) await this.executeActions(firstFrame.pre);

        console.log(`[Engine] Entering Node: ${nodeId}`);
        this.render();
    }

    private async finishNode() {
        if (!this.activeNodeId) return;
        const node = this.nodeMap.get(this.activeNodeId);
        
        // 1. Unmount 事件
        if (node?.unMount) await this.executeActions(node.unMount);

        // 2. 状态记录与 DAG 推进
        const oldId = this.activeNodeId;
        this.activeNodeId = null;
        this.currentFrameIndex = 0;

        if (node && !node.repeatable) {
            this.passedNodes.add(oldId);
            await this.step(oldId); // 递减后置节点入度
        }

        // 3. 自动链式尝试
        this.updateActiveNodes();
        if (this.activeNodes.length > 0) {
            // 如果完成后直接有剧情符合条件，自动带入
            await this.enterNode(this.activeNodes[0].node.id);
        }
    }

    private async step(completedNodeId: NodeId) {
        const node = this.nodeMap.get(completedNodeId);
        if (node && node.postNodes) {
            node.postNodes.forEach(targetId => {
                const target = this.nodes.find(n => n.node.id === targetId);
                if (target) target.inDegree--;
            });
        }
    }

    public updateActiveNodes(): void {
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
                try {
                    if (!(module as any)[req.func](...req.params)) return false;
                } catch (e) { return false; }
            }
        }
        return true;
    }

    public async executeActions(actions?: Action[]): Promise<void> {
        if (!actions) return;
        for (const action of actions) {
            const module = this.getModule(action.module);
            if (module && typeof (module as any)[action.func] === 'function') {
                try { await (module as any)[action.func](...action.params); } 
                catch (e) { console.error("Action error", e); }
            }
        }
    }

    private getModule(name: string): any {
        if (name === 'Engine') return this;
        return this.instances.find(inst => inst.id === name || inst.constructor.name === name);
    }

    private render() {
        if (!this.activeNodeId) return;
        const node = this.nodeMap.get(this.activeNodeId);
        const frame = node?.display[this.currentFrameIndex];
        console.log(`[RENDER] Node:${this.activeNodeId} Frame:${this.currentFrameIndex}`, frame);
    }

    // ... saveGame / loadGame 实现与之前一致
}
