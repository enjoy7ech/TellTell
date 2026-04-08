import { ISerializable } from '@telltell/core';

/**
 * 手机系统插件 (TypeScript 版)
 * 包含：基础 APP 框架、消息系统、联系人系统、通话系统
 */

export interface Contact {
    id: string;
    alias: string;
    avatar: string;
    title: string;
    memo: string;
    unlocked: boolean;
    isPlayer?: boolean;
}

export interface Message {
    id: string;
    fromId: string;
    text: string;
    time: number;
    isRead: boolean;
    isPlayer?: boolean;
}

export interface CallRecord {
    id: string;
    targetId: string;
    type: 'incoming' | 'outgoing';
    time: number;
    duration?: number;
    status: 'missed' | 'answered' | 'rejected';
}

export interface PhoneState {
    messages: Message[];
    contacts: Contact[];
    calls: CallRecord[];
    unlockedApps: string[];
}

export class PhoneSystem implements ISerializable {
    public id: string = "mobile";

    private messages: Message[] = [];
    private contacts: Contact[] = [
        { id: "player", alias: "我", avatar: "p_me.png", title: "自己", memo: "这是我的手机", unlocked: true, isPlayer: true },
        { id: "lin_yue", alias: "林月", avatar: "p_lin.png", title: "学姐", memo: "总是很忙碌的学姐", unlocked: true },
    ];
    private calls: CallRecord[] = [];
    private unlockedApps: string[] = ['messages', 'contact', 'phone'];

    constructor() { }

    /**
     * 持久化存档实现
     */
    public save(): PhoneState {
        return {
            messages: this.messages,
            contacts: this.contacts,
            calls: this.calls,
            unlockedApps: this.unlockedApps
        };
    }

    /**
     * 加载存档实现
     */
    public load(data: PhoneState): void {
        if (data) {
            this.messages = data.messages || [];
            this.contacts = data.contacts || this.contacts;
            this.calls = data.calls || [];
            this.unlockedApps = data.unlockedApps || this.unlockedApps;
        }
    }

    // --- 短信系统 ---

    public async receiveMessage(text: string, fromId: string): Promise<void> {
        const msg: Message = {
            id: `msg_${Date.now()}_${fromId}`,
            fromId,
            text,
            time: Date.now(),
            isRead: false
        };
        this.messages.push(msg);
        console.log(`[Phone] New Message from ${fromId}: ${text}`);
    }

    public async sendMessage(text: string, toId: string): Promise<void> {
        const msg: Message = {
            id: `msg_${Date.now()}_player`,
            fromId: "player",
            text,
            time: Date.now(),
            isRead: true,
            isPlayer: true
        };
        this.messages.push(msg);
        console.log(`[Phone] Player to ${toId}: ${text}`);
    }

    // --- 通讯录系统 ---

    public getContacts(): Contact[] {
        return this.contacts.filter(c => c.unlocked);
    }

    public async addContact(contact: Contact): Promise<void> {
        if (!this.contacts.find(c => c.id === contact.id)) {
            this.contacts.push({ ...contact, unlocked: true });
        }
    }

    // --- 通话系统 ---

    public async recordCall(record: Omit<CallRecord, 'id'>): Promise<void> {
        this.calls.push({
            id: `call_${Date.now()}`,
            ...record
        });
    }

    // --- 基础 APP ---

    public async unlockApp(appId: string): Promise<void> {
        if (!this.unlockedApps.includes(appId)) {
            this.unlockedApps.push(appId);
        }
    }

    /**
     * 辅助方法：获取未读条数
     */
    public getUnreadCount(): number {
        return this.messages.filter(m => !m.isRead).length;
    }

    public markAllAsRead(): void {
        this.messages.forEach(m => m.isRead = true);
    }
}
