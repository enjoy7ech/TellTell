import { ISerializable, CharacterId, TriggerRequirement } from './Types';

export interface CharacterData {
    id: CharacterId;
    name: string;
    favor: number;
    info: {
        text: string;
        lock: boolean;
        unlockRequirement?: TriggerRequirement[];
    }[];
}

/**
 * 角色管理器：负责管理所有 NPC 的状态、好感度、信息解锁
 */
export class CharacterManager implements ISerializable {
    public id: string = "Character";
    private characters: Map<CharacterId, CharacterData> = new Map();

    constructor() {}

    /**
     * 注册/初始化角色数据
     */
    public initCharacters(data: CharacterData[]): void {
        data.forEach(char => this.characters.set(char.id, char));
    }

    /**
     * 实现 ISerializable: 存档
     */
    public save(): any {
        return Array.from(this.characters.values());
    }

    /**
     * 实现 ISerializable: 读档
     */
    public load(data: CharacterData[]): void {
        if (data) {
            data.forEach(char => this.characters.set(char.id, char));
        }
    }

    // --- Action (可由 Action.js 调度) ---

    public async addFavor(charId: CharacterId, amount: number): Promise<void> {
        const char = this.characters.get(charId);
        if (char) {
            char.favor += amount;
            console.log(`[Character] ${char.name} favor +${amount}. Current: ${char.favor}`);
        }
    }

    public async unlockInfo(charId: CharacterId, infoIndex: number): Promise<void> {
        const char = this.characters.get(charId);
        if (char && char.info[infoIndex]) {
            char.info[infoIndex].lock = false;
        }
    }

    // --- Trigger (用于节点判定) ---

    public checkFavor(charId: CharacterId, minFavor: number): boolean {
        const char = this.characters.get(charId);
        return char ? char.favor >= minFavor : false;
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
