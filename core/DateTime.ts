import { ISerializable } from './Types';

/**
 * 时间日期模型：用于结构化表示游戏时间
 */
export interface DateTimeInfo {
    year: number;
    month: number;
    day: number;
    hour: number;
    minute: number;
    timestamp: number;
}

/**
 * 时间日期管理器：负责管理游戏内的历法与时间流逝 (基于标准时间戳)
 */
export class DateTimeManager implements ISerializable {
    public id: string = "DateTime";

    // 默认起始时间点：2024-01-01 08:00:00
    private readonly START_TIME = new Date("2024-01-01T08:00:00").getTime();
    private _currentTime: number = this.START_TIME;

    constructor() {}

    /**
     * 实现 ISerializable: 存档
     */
    public save(): any {
        return { currentTime: this._currentTime };
    }

    /**
     * 实现 ISerializable: 读档
     */
    public load(data: any): void {
        if (data && typeof data.currentTime === 'number') {
            this._currentTime = data.currentTime;
        }
    }

    // --- Action (修改状态) ---

    /**
     * 增加时间 (分钟)
     */
    public async addMinutes(minutes: number): Promise<void> {
        this._currentTime += minutes * 60 * 1000;
        console.log(`[DateTime] Time advanced by ${minutes}m. Current: ${this.format()}`);
    }

    /**
     * 直接跳转到下一天的指定时刻
     */
    public async nextDayAt(hour: number, minute: number = 0): Promise<void> {
        const d = new Date(this._currentTime);
        d.setDate(d.getDate() + 1);
        d.setHours(hour, minute, 0, 0);
        this._currentTime = d.getTime();
        console.log(`[DateTime] Advanced to next day ${hour}:${minute}. Current: ${this.format()}`);
    }

    /**
     * 设置为指定的新日期/时间
     */
    public async setAbsoluteTime(dateStr: string): Promise<void> {
        const d = new Date(dateStr);
        if (!isNaN(d.getTime())) {
            this._currentTime = d.getTime();
        }
    }

    // --- Query (查询) ---

    /**
     * 获取详细时间对象 (基于 Date 原生 API 自动处理月份与闰年)
     */
    public getDateTimeInfo(): DateTimeInfo {
        const d = new Date(this._currentTime);
        return {
            year: d.getFullYear(),
            month: d.getMonth() + 1, // 0-indexed
            day: d.getDate(),
            hour: d.getHours(),
            minute: d.getMinutes(),
            timestamp: this._currentTime
        };
    }

    /**
     * 格式化输出字符串
     */
    public format(): string {
        const i = this.getDateTimeInfo();
        const pad = (n: number) => n.toString().padStart(2, '0');
        return `${i.year}/${pad(i.month)}/${pad(i.day)} ${pad(i.hour)}:${pad(i.minute)}`;
    }

    /**
     * 获取当前毫秒级时间戳
     */
    public getRawTimestamp(): number {
        return this._currentTime;
    }
}
