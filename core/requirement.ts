/**
 * [TellTell Requirement Logic]
 * 核心逻辑判定方法定义:
 * 
 * favorGT(sourceChar, targetChar, n) 
 * -> 判定 source 对 target 的好感度是否大于 n (source.favor.get(target) > n)
 * 
 * favorLT(sourceChar, targetChar, n) 
 * -> 判定 source 对 target 的好感度是否小于 n (source.favor.get(target) < n)
 * 
 * timeGT(T) 
 * -> 判定当前游戏内时间(分钟/计数)是否大于 T
 * 
 * timeLT(T) 
 * -> 判定当前游戏内时间(分钟/计数)是否小于 T
 */

import { CharacterManager } from './CharacterManager';

export class RequirementManager {
    public id: string = "Requirement";
    private engine: any = null;

    constructor() { }

    /**
     * 引擎注册模块时注入引用
     */
    public bindEngine(engine: any) {
        this.engine = engine;
    }

    /**
     * 实现 ISerializable (即使不 load/save 也需满足接口，如果引擎强制要求的话)
     * 目前按照您的要求，内部不实现具体的持久化逻辑
     */
    public save(): any { return null; }
    public load(data: any): void { }

    // --- 核心方法实现 ---

    /**
     * 判定角色 A 对角色 B 的好感度是否大于 n
     */
    public favorGT(charA: string, charB: string, n: number): boolean {
        if (!this.engine) return false;
        const charMgr = this.engine.getModule('Character') as CharacterManager;
        if (!charMgr) return false;

        const favorVal = Number(charMgr.getFavor(charA, charB)) || 0;
        return favorVal > n;
    }

    /**
     * 判定角色 A 对角色 B 的好感度是否小于 n
     */
    public favorLT(charA: string, charB: string, n: number): boolean {
        if (!this.engine) return false;
        const charMgr = this.engine.getModule('Character') as CharacterManager;
        if (!charMgr) return false;

        const favorVal = Number(charMgr.getFavor(charA, charB)) || 0;
        return favorVal < n;
    }

    /**
     * 判定游戏当前时间戳是否大于 T (毫秒)
     */
    public timeGT(T: number): boolean {
        if (!this.engine) return false;
        const dtMgr = this.engine.getModule('DateTime');
        if (!dtMgr) return false;
        return dtMgr.getRawTimestamp() > T;
    }

    /**
     * 判定游戏当前时间戳是否小于 T (毫秒)
     */
    public timeLT(T: number): boolean {
        if (!this.engine) return false;
        const dtMgr = this.engine.getModule('DateTime');
        if (!dtMgr) return false;
        return dtMgr.getRawTimestamp() < T;
    }
}
