/**
 * ISerializable 接口定义：所有需要持久化状态的模块均需实现
 */
export interface ISerializable {
    save(): any; // 导出当前状态数据
    load(data: any): void; // 从存档数据恢复状态
}

/**
 * 剧情节点 ID 类型
 */
export type NodeId = string;
export type CharacterId = string;
export type LocationId = string;
export type MapId = string;

/**
 * 动作 / 触发判定 结构
 */
export interface Action {
    module: string; // 目标模块名，如 'Engine', 'mobile'
    func: string; // 函数名
    params: any[]; // 参数列表
}

export type TriggerRequirement = Action;

/**
 * 分镜帧定义
 */
export interface DisplayFrame {
    screen?: { pic: string; text?: string }; // 场景背景
    dialog?: { char: string; text: string; pic?: string }; // 对话，对话时可覆盖角色默认立绘
    choice?: Choice[]; // 选项
    transition?: string; // 过场动画
    pre?: Action[]; // 帧前动作
    post?: Action[]; // 帧后动作
}

export interface Choice {
    text: string;
    requirement?: TriggerRequirement[];
    target?: NodeId;
}

/**
 * 剧情节点定义 (StoryEventNode)
 */
export interface StoryEventNode {
    id: NodeId;
    postNodes: NodeId[]; // 后置节点
    display: DisplayFrame[];
    repeatable?: boolean; // 可重复触发
    triggers?: TriggerRequirement[];
    priority?: number;
    mount?: Action[];
    unMount?: Action[];
}
