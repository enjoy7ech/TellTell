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
    private currentNode: StoryEventNode | null = null;
    private currentFrameIndex: number = -1;

    constructor(private config: EngineConfig) {}

    /**
     * 注册子系统或插件实例
     */
    public registerModule(instance: any): void {
        this.instances.push(instance);
        
        // 如果模块实现了 bindEngine 接口，则自动注入引擎引用
        if (typeof (instance as any).bindEngine === 'function') {
            (instance as any).bindEngine(this);
        }
    }

    /**
     * 初始化引擎，读取剧情文件并构建 DAG
     */
    public async init(): Promise<void> {
        try {
            const response = await fetch(this.config.storyUrl);
            const storyData: { nodes: StoryEventNode[], characters?: any[] } = await response.json();
            
            // 1. 初始化剧情节点
            this.buildDAG(storyData.nodes);

            // 2. 自动初始化 CharacterManager (如果存在数据)
            if (storyData.characters) {
                const charMgr = this.getModule('Character');
                if (charMgr && typeof charMgr.initCharacters === 'function') {
                    charMgr.initCharacters(storyData.characters);
                }
            }

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
     * 核心剧情主推器
     */
    public async playNext(): Promise<void> {
        if (!this.initialized) await this.init();

        // 1. 若当前无活跃节点，尝试加载初始节点
        if (!this.currentNode) {
            this.updateActiveNodes();
            if (this.activeNodes.length > 0) {
                this.currentNode = this.activeNodes[0].node;
                this.currentFrameIndex = 0;
                await this.executeActions(this.currentNode.mount);
            } else {
                console.warn("No active nodes available to start.")
                return;
            }
        } 
        // 2. 检查当前节点是否已播完
        else if (this.currentFrameIndex >= this.currentNode.display.length - 1) {
            // 当前节点完成，步进 DAG
            const completedId = this.currentNode.id;
            await this.executeActions(this.currentNode.unMount);
            await this.step(completedId);
            
            // 尝试挑选下一个节点
            if (this.activeNodes.length > 0) {
                this.currentNode = this.activeNodes[0].node;
                this.currentFrameIndex = 0;
                await this.executeActions(this.currentNode.mount);
            } else {
                // 彻底结束或阻塞
                this.currentNode = null;
                this.currentFrameIndex = -1;
                console.log("No more nodes.");
                return;
            }
        } 
        // 3. 推进下一帧
        else {
            this.currentFrameIndex++;
        }

        // 4. 渲染当前帧
        const frame = this.currentNode.display[this.currentFrameIndex];
        this.renderFrame(frame);
    }

    private async renderFrame(frame: any): Promise<void> {
        if (!frame) return;
        
        // 执行帧前 Action
        await this.executeActions(frame.pre);

        const nameEl = document.getElementById('charName');
        const textEl = document.getElementById('dialogueText');
        const bgEl = document.getElementById('gameBackground');
        const portraitEl = document.getElementById('charPortrait') as HTMLImageElement;
        const choiceContainer = document.getElementById('choiceContainer');

        if (frame.dialog) {
            if (nameEl) nameEl.innerText = frame.dialog.char;
            if (textEl) textEl.innerText = frame.dialog.text;
            
            // 渲染角色立绘
            if (portraitEl) {
                if (frame.dialog.pic) {
                    portraitEl.src = `/assets/character/${frame.dialog.char}/portrait/${frame.dialog.pic}.webp`;
                    portraitEl.classList.remove('hidden');
                } else {
                    portraitEl.classList.add('hidden');
                }
            }
        }

        if (frame.screen && frame.screen.pic && bgEl) {
            bgEl.style.backgroundImage = `url('/assets/scene/${frame.screen.pic}.webp')`;
        }

        // 处理选项
        if (choiceContainer) {
            choiceContainer.innerHTML = '';
            if (frame.choice && frame.choice.length > 0) {
                choiceContainer.classList.remove('hidden');
                frame.choice.forEach((c: any) => {
                    const btn = document.createElement('div');
                    btn.className = 'choice-btn';
                    btn.innerText = c.text;
                    btn.onclick = (e) => {
                        e.stopPropagation();
                        choiceContainer.classList.add('hidden');
                        this.playNext();
                    };
                    choiceContainer.appendChild(btn);
                });
            } else {
                choiceContainer.classList.add('hidden');
            }
        }

        // 执行帧后 Action
        await this.executeActions(frame.post);
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
