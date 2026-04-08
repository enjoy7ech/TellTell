import { reactive, ref, computed } from 'vue';

export function usePhoneSystem(engine: any) {
    const showPhone = ref(false);
    const activeApp = ref<string | null>(null);
    const currentTime = ref('12:00');

    const phoneData = reactive({
        unlockedApps: [] as string[],
        messages: [] as any[],
        contacts: [] as any[],
        calls: [] as any[],
        unreadCount: 0
    });

    const mapData = reactive({
        currentMap: null as any,
        locations: [] as any[]
    });

    /**
     * 同步引擎手机系统模块的数据
     */
    const syncPhoneData = () => {
        const mobileSystem = engine.getModule('mobile');
        if (mobileSystem) {
            const state = mobileSystem.save();
            phoneData.unlockedApps = state.unlockedApps || [];
            phoneData.messages = state.messages || [];
            phoneData.contacts = state.contacts || [];
            phoneData.calls = state.calls || [];
            phoneData.unreadCount = mobileSystem.getUnreadCount();
        }
    };

    const togglePhone = () => {
        syncPhoneData();
        showPhone.value = !showPhone.value;
        activeApp.value = null; // 每次打开回到桌面
        
        if (showPhone.value) {
            const mobileSystem = engine.getModule('mobile');
            if (mobileSystem && activeApp.value === 'messages') {
                 mobileSystem.markAllAsRead();
                 phoneData.unreadCount = 0;
            }
        }
    };

    const openApp = (appId: string | null) => {
        if (appId === null) {
            if (activeApp.value === null) {
                showPhone.value = false; // 已在桌面，再次关闭
                return;
            }
            activeApp.value = null;
            return;
        }

        activeApp.value = appId;
        syncPhoneData();
        
        const mobileSystem = engine.getModule('mobile');
        if (appId === 'messages' && mobileSystem) {
            mobileSystem.markAllAsRead();
            phoneData.unreadCount = 0;
        }
        
        if (appId === 'map') {
            const mapSystem = engine.getModule('map');
            if (mapSystem) {
                mapData.currentMap = mapSystem.getCurrentMap();
                mapData.locations = mapSystem.getLocationsByMap();
            }
        }
    };

    const handleTeleport = async (locId: string) => {
        const mapSystem = engine.getModule('map');
        if (mapSystem) {
            await mapSystem.teleport(locId);
            showPhone.value = false;
            await engine.next();
        }
    };

    // 每分钟更新一次手机时间
    const updateClock = () => {
        const now = new Date();
        currentTime.value = now.getHours().toString().padStart(2, '0') + ':' + 
                          now.getMinutes().toString().padStart(2, '0');
    };
    setInterval(updateClock, 60000);
    updateClock();

    return {
        showPhone,
        activeApp,
        currentTime,
        phoneData,
        mapData,
        togglePhone,
        openApp,
        handleTeleport,
        syncPhoneData
    };
}
