import { ISerializable, LocationId, MapId } from './Types';

export interface LocationData {
    id: LocationId;
    name: string;
    description?: string;
    lock: boolean;
    pinPic: string; // 地图上的 Pin 图片
    mapPic: string; // 场景背景图
}

export interface MapData {
    id: MapId;
    name: string;
    locations: LocationId[];
}

/**
 * 地图管理器：管理地点解锁、场景切换
 */
export class MapManager implements ISerializable {
    public id: string = "Map";
    private locations: Map<LocationId, LocationData> = new Map();
    private maps: Map<MapId, MapData> = new Map();
    private currentMapId: MapId = "";
    private currentLoctionId: LocationId = "";

    constructor() {}

    public init(locations: LocationData[], maps: MapData[]): void {
        locations.forEach(loc => this.locations.set(loc.id, loc));
        maps.forEach(m => this.maps.set(m.id, m));
    }

    /**
     * 实现 ISerializable
     */
    public save(): any {
        return {
            locations: Array.from(this.locations.values()),
            currentMapId: this.currentMapId,
            currentLocationId: this.currentLoctionId
        };
    }

    public load(data: any): void {
        if (data) {
            data.locations.forEach((loc: LocationData) => this.locations.set(loc.id, loc));
            this.currentMapId = data.currentMapId;
            this.currentLoctionId = data.currentLocationId;
        }
    }

    // --- Action ---

    /**
#DEFINE_UI_FUNCTION
@description 解锁指定地点
@type action
@module Map 地图系统
@param locId 地点ID | unit:LocationSelector
@returns Promise<void>
#END_DEFINE_UI_FUNCTION
     */
    public async unlockLocation(locId: LocationId): Promise<void> {
        const loc = this.locations.get(locId);
        if (loc) loc.lock = false;
    }

    /**
#DEFINE_UI_FUNCTION
@description 切换当前大地图
@type action
@module Map 地图系统
@param mapId 地图ID | unit:MapSelector
@returns Promise<void>
#END_DEFINE_UI_FUNCTION
     */
    public async switchMap(mapId: MapId): Promise<void> {
        if (this.maps.has(mapId)) {
            this.currentMapId = mapId;
            console.log(`[Map] Switched to map: ${mapId}`);
        }
    }

    /**
#DEFINE_UI_FUNCTION
@description 传送至指定地点 (需已解锁)
@type action
@module Map 地图系统
@param locId 地点ID | unit:LocationSelector
@returns Promise<void>
#END_DEFINE_UI_FUNCTION
     */
    public async teleport(locId: LocationId): Promise<void> {
        const loc = this.locations.get(locId);
        if (loc && !loc.lock) {
            this.currentLoctionId = locId;
            console.log(`[Map] Teleported to: ${loc.name}`);
        }
    }

    // --- Trigger ---

    /**
#DEFINE_UI_FUNCTION
@description 判定指定地点是否已解锁
@type judge
@module Map 地图系统
@param locId 地点ID | unit:LocationSelector
@returns boolean
#END_DEFINE_UI_FUNCTION
     */
    public isLocationUnlocked(locId: LocationId): boolean {
        return this.locations.get(locId)?.lock === false;
    }

    /**
#DEFINE_UI_FUNCTION
@description 判定玩家当前是否在某地点
@type judge
@module Map 地图系统
@param locId 地点ID | unit:LocationSelector
@returns boolean
#END_DEFINE_UI_FUNCTION
     */
    public isAtLocation(locId: LocationId): boolean {
        return this.currentLoctionId === locId;
    }

    public getCurrentLocation(): LocationData | undefined {
        return this.locations.get(this.currentLoctionId);
    }
}
