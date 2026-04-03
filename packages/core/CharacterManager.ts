import { ISerializable, CharacterId, TriggerRequirement } from './Types';

export interface CharacterData {
    id: CharacterId;
    name: string;
    isProtagonist?: boolean;
    favor: Map<CharacterId, number>; // 对不同角色的好感度 Map
    phoneNumber?: string;
    
    height?: number;
    weight?: number;
    age?: number;
    bloodType?: string;
    birthDate?: string;
    constellation?: string;

    picMap?: Map<string, string>;
    audioMap?: Map<string, string>;

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
            if (char.picMap && !(char.picMap instanceof Map)) {
                char.picMap = new Map(Object.entries(char.picMap));
            }
            if (char.audioMap && !(char.audioMap instanceof Map)) {
                char.audioMap = new Map(Object.entries(char.audioMap));
            }
            this.characters.set(char.id, char);
        });
    }

    /**
     * 实现 ISerializable: 存档
     */
    public save(): any {
        return Array.from(this.characters.values()).map(char => {
            const out = { ...char } as any;
            out.favor = Object.fromEntries(char.favor);
            if (char.picMap instanceof Map) out.picMap = Object.fromEntries(char.picMap);
            if (char.audioMap instanceof Map) out.audioMap = Object.fromEntries(char.audioMap);
            return out;
        });
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
#DEFINE_UI_FUNCTION
@description 增加/修改角色间的数值型好感度
@type action
@module Character 角色状态
@param fromId 来源角色 | unit:CharacterSelector
@param toId 目标角色 | unit:CharacterSelector
@param amount 变更数量 | unit:el-input-number | controls:false
@returns Promise<void>
#END_DEFINE_UI_FUNCTION
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

    /**
#DEFINE_UI_FUNCTION
@description 判定角色 A 对角色 B 的好感度是否大于 n
@type judge
@module Character 角色状态
@param charA 源角色 | unit:CharacterSelector
@param charB 目标角色 | unit:CharacterSelector
@param n 数值 | unit:el-input-number | controls:false
@returns boolean
#END_DEFINE_UI_FUNCTION
     */
    public favorGT(charA: string, charB: string, n: number): boolean {
        const favorVal = Number(this.getFavor(charA, charB)) || 0;
        return favorVal > n;
    }

    /**
#DEFINE_UI_FUNCTION
@description 判定角色 A 对角色 B 的好感度是否小于 n
@type judge
@module Character 角色状态
@param charA 源角色 | unit:CharacterSelector
@param charB 目标角色 | unit:CharacterSelector
@param n 数值 | unit:el-input-number | controls:false
@returns boolean
#END_DEFINE_UI_FUNCTION
     */
    public favorLT(charA: string, charB: string, n: number): boolean {
        const favorVal = Number(this.getFavor(charA, charB)) || 0;
        return favorVal < n;
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
