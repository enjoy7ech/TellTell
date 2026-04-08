import { ISerializable } from '@telltell/core';

/**
 * 巡游地图系统插件
 */
export interface MapState {
    currentMapId: string | null;
    visitedLocations: string[];
}

export class MapSystem implements ISerializable {
    public id: string = "map";
    private currentMapId: string | null = "city_center";
    private visitedLocations: string[] = [];

    // 可以在这里注入地图数据
    private maps: Record<string, any> = {
        "city_center": {
            id: "city_center",
            name: "城市中心",
            background: "city.jpg",
            locations: [
                { id: "cafe", name: "流浪咖啡馆", position: [30, 45], lock: false },
                { id: "library", name: "寂静图书馆", position: [70, 20], lock: false },
                { id: "secret_park", name: "神秘公园", position: [50, 80], lock: true }
            ]
        }
    };

    constructor() { }

    public save(): MapState {
        return {
            currentMapId: this.currentMapId,
            visitedLocations: this.visitedLocations
        };
    }

    public load(data: MapState): void {
        if (data) {
            this.currentMapId = data.currentMapId || "city_center";
            this.visitedLocations = data.visitedLocations || [];
        }
    }

    // --- 核心方法 (由 UI 调用) ---

    public getCurrentMap() {
        return this.maps[this.currentMapId || "city_center"];
    }

    public getLocationsByMap() {
        const map = this.getCurrentMap();
        return map ? map.locations : [];
    }

    public async teleport(locationId: string): Promise<void> {
        console.log(`[Map] Teleporting to: ${locationId}`);
        // 这里可以注入跳转剧情节点的逻辑 if needed
    }
}
