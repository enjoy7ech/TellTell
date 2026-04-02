import { ISerializable, CharacterId, TriggerRequirement } from './Types';

export interface CharacterData {
    id: CharacterId;
    name: string;
    favor: Map<CharacterId, number>; // 对不同角色的好感度 Map
    isProtagonist?: boolean;
    info: {
        text: string;
        lock: boolean;
        unlockRequirement?: TriggerRequirement[];
    }[];
}

/**
 * 角色管理器：负责管理所有 NPC 的状态、好感度关系网、信息解锁
 */
export class CharacterManager implements ISerializable {
    public id: string = "Character";
    private characters: Map<CharacterId, CharacterData> = new Map();

    constructor() {}

    /**
     * 注册/初始化角色数据
     */
    public initCharacters(data: any[]): void {
        data.forEach(char => {
            // 兼容普通对象转 Map
            if (!(char.favor instanceof Map)) {
                char.favor = new Map(Object.entries(char.favor || {}));
            }
            this.characters.set(char.id, char);
        });
    }

    /**
     * 实现 ISerializable: 存档
     */
    public save(): any {
        return Array.from(this.characters.values()).map(char => ({
            ...char,
            favor: Object.fromEntries(char.favor)
        }));
    }

    /**
     * 实现 ISerializable: 读档
     */
    public load(data: any[]): void {
        if (data) {
            this.initCharacters(data);
        }
    }

    // --- Action (修改状态) ---

    /**
     * 增加好感度：from 角色对 to 角色的好感增加
     */
    public async addFavor(fromId: CharacterId, toId: CharacterId, amount: number): Promise<void> {
        const char = this.characters.get(fromId);
        if (char) {
            const current = char.favor.get(toId) || 0;
            char.favor.set(toId, current + amount);
            console.log(`[Character] ${fromId}'s favor for ${toId} +${amount}. Current: ${current + amount}`);
        }
    }

    // --- Trigger / Query ---

    /**
     * 获取指定角色的好感度
     */
    public getFavor(fromId: CharacterId, toId: CharacterId): number {
        const char = this.characters.get(fromId);
        return char ? (char.favor.get(toId) || 0) : 0;
    }

    public isInfoUnlocked(charId: CharacterId, infoIndex: number): boolean {
        const char = this.characters.get(charId);
        return char ? !char.info[infoIndex].lock : false;
    }

    /**
     * 获取角色实例
     */
    public getCharacter(charId: CharacterId): CharacterData | undefined {
        return this.characters.get(charId);
    }
}
