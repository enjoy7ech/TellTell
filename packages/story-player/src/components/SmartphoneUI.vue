<script setup lang="ts">
import { computed } from 'vue';
/**
 * SmartphoneUI.vue 
 * 升级版：参考 Tiny Story 风格的 iOS 拟真设计
 */
const props = defineProps<{
    show: boolean;
    currentTime: string;
    phoneData: any;
    mapData: any;
    activeApp: string | null;
}>();

const emit = defineEmits(['close', 'openApp', 'teleport']);

// --- Home Bar 手势逻辑 ---
let touchStartY = 0;
const handleHomeTouchStart = (e: TouchEvent) => {
    touchStartY = e.touches[0].clientY;
};
const handleHomeTouchEnd = (e: TouchEvent | MouseEvent) => {
    // 阻止浏览器重复触发点击事件
    if (e.cancelable) e.preventDefault();

    let deltaY = 0;
    if (e instanceof TouchEvent) {
        const touchEndY = e.changedTouches[0].clientY;
        deltaY = touchStartY - touchEndY;
    }

    if (deltaY > 40 || deltaY === 0) {
        // 如果是上划（>40）或者是纯点击（===0），则执行返回桌面/关闭逻辑
        emit('openApp', null);
    }
};

const handleTeleport = (locId: string) => {
    emit('teleport', locId);
};
</script>

<template>
    <Transition name="phone-slide">
        <div v-if="show" class="phone-overlay" @click.stop="$emit('close')">
            <div class="smartphone" @click.stop>
                <div class="phone-screen" :class="{ 'is-app-open': activeApp }">
                    
                    <!-- [Header] Status Bar (Reference: Tiny Story) -->
                    <div class="phone-header">
                        <span class="phone-time">{{ currentTime }}</span>
                        <div class="phone-icons">
                            <svg class="icon-signal" width="18" height="12" viewBox="0 0 18 12" fill="currentColor">
                                <rect x="0" y="8" width="3" height="4" rx="1" />
                                <rect x="5" y="6" width="3" height="6" rx="1" />
                                <rect x="10" y="3" width="3" height="9" rx="1" />
                                <rect x="15" y="0" width="3" height="12" rx="1" />
                            </svg>
                            <svg class="icon-wifi" width="16" height="12" viewBox="0 0 16 12" fill="currentColor">
                                <path d="M8 12c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm4.2-4.2c2.3-2.3 2.3-6.1 0-8.5-2.3-2.3-6.1-2.3-8.5 0-2.3 2.3-2.3 6.1 0 8.5" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" />
                            </svg>
                            <svg class="icon-battery" width="24" height="12" viewBox="0 0 24 12" fill="none">
                                <rect x="0.5" y="0.5" width="20" height="11" rx="2.5" stroke="currentColor" />
                                <rect x="2.5" y="2.5" width="14" height="7" rx="1" fill="currentColor" />
                                <path d="M22 4c.8 0 1.5.7 1.5 1.5v1c0 .8-.7 1.5-1.5 1.5" stroke="currentColor" stroke-linecap="round" />
                            </svg>
                        </div>
                    </div>

                    <div class="phone-body">
                        <!-- 1. Home Screen (Desktop View) -->
                        <div v-if="!activeApp" class="home-screen">
                            <div class="app-grid">
                                <div v-if="phoneData?.unlockedApps?.includes('map')" class="app-icon" @click="$emit('openApp', 'map')">
                                    <div class="icon-bg map-app"></div>
                                    <span class="app-label">巡游地图</span>
                                </div>
                                <div v-if="phoneData?.unlockedApps?.includes('messages')" class="app-icon" @click="$emit('openApp', 'messages')">
                                    <div class="icon-bg msg-app">
                                        <div v-if="(phoneData?.unreadCount || 0) > 0" class="badge-dot"></div>
                                    </div>
                                    <span class="app-label">简讯</span>
                                </div>
                                <div class="app-icon" @click="$emit('openApp', 'settings')">
                                    <div class="icon-bg settings-app"></div>
                                    <span class="app-label">系统设置</span>
                                </div>
                            </div>

                            <!-- Dock -->
                            <div class="phone-dock">
                                <div class="app-icon" @click="$emit('openApp', 'messages')">
                                    <div class="icon-bg msg-app"></div>
                                </div>
                                <div class="app-icon">
                                    <div class="icon-bg notes-app"></div>
                                </div>
                                <div class="app-icon">
                                    <div class="icon-bg contact-app"></div>
                                </div>
                                <div class="app-icon" @click="$emit('openApp', 'map')">
                                    <div class="icon-bg map-app"></div>
                                </div>
                            </div>
                        </div>

                        <!-- 2. Messages App -->
                        <div v-else-if="activeApp === 'messages'" class="phone-app-view">
                             <div class="app-view-header">
                                <button class="back-btn" @click="$emit('openApp', null)">←</button>
                                <h2 class="phone-app-title">近期简讯</h2>
                             </div>
                             <div class="msg-list">
                                <div v-for="(msg, i) in phoneData.messages" :key="i" class="msg-item" :class="{ 'msg-player': msg.isPlayer }">
                                    <div class="msg-sender" v-if="!msg.isPlayer">{{ msg.fromId }}</div>
                                    <div class="msg-bubble">{{ msg.text }}</div>
                                </div>
                            </div>
                        </div>

                        <!-- 3. Map App -->
                        <div v-else-if="activeApp === 'map'" class="phone-app-view">
                            <div class="app-view-header">
                                <button class="back-btn" @click="$emit('openApp', null)">←</button>
                                <h2 class="phone-app-title">地图巡航</h2>
                             </div>
                            <div class="map-view-container" :style="{ backgroundImage: mapData.currentMap?.background ? `url('/ui/map/${mapData.currentMap.background}')` : 'none' }">
                                <div v-for="loc in mapData.locations" :key="loc.id" class="map-pin" :class="{ 'locked': loc.lock }"
                                    :style="{ left: loc.position?.[0] + '%', top: loc.position?.[1] + '%' }" @click="handleTeleport(loc.id)">
                                    <div class="pin-icon">📍</div><div class="pin-label">{{ loc.name }}</div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- Home Bar -->
                    <div class="phone-home-indicator" 
                         @touchstart="handleHomeTouchStart"
                         @touchend="handleHomeTouchEnd"
                         @click="handleHomeTouchEnd">
                    </div>
                </div>
            </div>
        </div>
    </Transition>
</template>

<style scoped>
/* 局部样式，确保不干扰全局但完美对齐 iOS 风格 */
.phone-header {
    width: 100%; height: 70px; padding: 24px 30px 0;
    display: flex; justify-content: space-between; align-items: flex-start;
    font-size: 0.85rem; font-weight: 700; z-index: 1010;
    position: absolute; top: 0; left: 0; pointer-events: none;
}
.phone-header::before {
    content: ""; position: absolute; top: 12px; left: 50%;
    transform: translateX(-50%); width: 100px; height: 28px;
    background: #000; border-radius: 20px; z-index: -1;
    box-shadow: 0 4px 10px rgba(0, 0, 0, 0.3);
}
.app-view-header {
    padding: 100px 25px 20px; display: flex; align-items: center; gap: 15px;
}
.phone-app-title { font-size: 1.8rem; font-weight: 800; }
.back-btn { background: none; border: none; font-size: 1.5rem; cursor: pointer; color: inherit; }

.badge-dot {
    position: absolute; top: 4px; right: 4px; width: 14px; height: 14px;
    background: #ff5b5b; border: 2px solid #fff; border-radius: 50%;
}
</style>
