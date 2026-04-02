import { ISerializable } from '../core/Types';

/**
 * 手机系统插件 (TypeScript 版)
 */
export interface PhoneState {
    messages: any[];
    unlockedApps: string[];
}

export class PhoneSystem implements ISerializable {
    public id: string = "mobile";
    private messages: any[] = [];
    private unlockedApps: string[] = ['map', 'contact'];

    constructor() {}

    /**
     * 持久化存档实现
     */
    public save(): PhoneState {
        return {
            messages: this.messages,
            unlockedApps: this.unlockedApps
        };
    }

    /**
     * 加载存档实现
     */
    public load(data: PhoneState): void {
        if (data) {
            this.messages = data.messages || [];
            this.unlockedApps = data.unlockedApps || [];
        }
    }

    // --- Action (可由剧情系统通过字符串反射调用) ---

    public async sendMessage(text: string, fromId: string = "unknown"): Promise<void> {
        this.messages.push({ text, fromId, time: Date.now() });
        console.log(`[Phone] New Message: ${text}`);
    }

    public async unlockApp(appId: string): Promise<void> {
        if (!this.unlockedApps.includes(appId)) {
            this.unlockedApps.push(appId);
        }
    }

    // --- Trigger (可用于剧情节点条件判定) ---

    public checkMessageCount(minCount: number): boolean {
        return this.messages.length >= minCount;
    }
}
