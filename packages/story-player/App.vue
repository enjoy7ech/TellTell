<script setup lang="ts">
import { ref, onMounted, reactive } from 'vue';
import './index.css';

const props = defineProps<{
    engine: any;
}>();

// --- 状态管理 ---
const isInitialized = ref(false);
const showMenu = ref(true);
const showGameLayer = ref(false);
const showPhone = ref(false);
const activeApp = ref<string | null>(null);
const currentTime = ref('12:00');

// Update time every minute
const updateClock = () => {
    const now = new Date();
    currentTime.value = now.getHours().toString().padStart(2, '0') + ':' + 
                      now.getMinutes().toString().padStart(2, '0');
};
setInterval(updateClock, 60000);
updateClock();

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

const frame = reactive({
    id: '',
    name: '',
    text: '',
    screenPic: '',
    screenText: '',
    characters: [] as string[],
    look: {} as Record<string, string>,
    choices: [] as any[]
});

const syncPhoneData = () => {
    const mobileSystem = props.engine.getModule('mobile');
    if (mobileSystem) {
        const state = mobileSystem.save();
        phoneData.unlockedApps = state.unlockedApps || [];
        phoneData.messages = state.messages || [];
        phoneData.contacts = state.contacts || [];
        phoneData.calls = state.calls || [];
        phoneData.unreadCount = mobileSystem.getUnreadCount();
    }
};

// --- 生命周期与事件监听 ---
onMounted(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const startNode = urlParams.get('startNode');
    const skipHome = urlParams.get('skipHome') === 'true';

    if (startNode || skipHome) {
        showMenu.value = false;
        showGameLayer.value = true;
    }

    // 1. 监听初始化
    props.engine.on('initialized', () => {
        isInitialized.value = true;
        syncPhoneData();
    });

    // 2. 监听帧渲染
    props.engine.on('render', (newFrame: any) => {
        const currentNodeId = props.engine.currentNode?.id;
        console.log("[App] Frame Rendered:", currentNodeId, newFrame);
        
        // 核心：全量扁平化更新
        frame.id = currentNodeId || '';
        frame.text = newFrame.dialog?.text || "";
        frame.name = newFrame.dialog ? props.engine.getCharacterName(newFrame.dialog.char) : "";
        
        // 人物逻辑
        if (newFrame.dialog?.char && newFrame.dialog?.pic) {
            frame.look[newFrame.dialog.char] = newFrame.dialog.pic;
            if (!frame.characters.includes(newFrame.dialog.char)) {
                frame.characters.push(newFrame.dialog.char);
            }
        }
        if (newFrame.look) {
            frame.look = { ...frame.look, ...newFrame.look };
            frame.characters = Object.keys(frame.look);
        } else if (!newFrame.dialog?.char) {
            frame.characters = [];
        }

        // 场景逻辑
        if (newFrame.screen) {
            frame.screenPic = resolveAssetPath(newFrame.screen.pic || frame.screenPic);
            frame.screenText = newFrame.screen.text || frame.screenText || "";
        }

        frame.choices = newFrame.choice || [];
    });

    setTimeout(() => {
        if (!isInitialized.value) isInitialized.value = true;
    }, 3000);
});

/**
 * 核心：解析资产路径，剔除多余前缀
 */
const resolveAssetPath = (path: string) => {
    if (!path) return '';
    return path.replace(/^assets\//, '').replace(/^\/assets\//, '');
};

// --- UI 交互方法 ---
const startNewNarrative = async () => {
    showMenu.value = false;
    showGameLayer.value = true;
    await props.engine.startStoryNode('intro');
};

const handleDialogueClick = (e?: any) => {
    if (frame.choices.length === 0) {
        props.engine.next();
    }
};

const handleGlobalClick = (e: any) => {
    if (showGameLayer.value && !showPhone.value) {
        handleDialogueClick();
    }
};

const handleChoice = async (choice: any) => {
    if (choice.action?.length > 0) {
        await props.engine.executeActions(choice.action);
    }
    frame.choices = [];
    await props.engine.next(); // 选完自动下一步
};

const getPortraitUrl = (char: string, pic: string) => {
    const cleanPic = resolveAssetPath(pic).split('/').pop();
    return `/character/${char}/portrait/${cleanPic}`;
};

const getBgStyle = () => {
    if (frame.screenPic) {
        return { backgroundImage: `url('/scene/${frame.screenPic}')` };
    }
    return { backgroundColor: '#000' };
};

const togglePhone = () => {
    syncPhoneData();
    showPhone.value = !showPhone.value;
    activeApp.value = null;
    
    if (showPhone.value) {
        const mobileSystem = props.engine.getModule('mobile');
        if (mobileSystem && activeApp.value === 'messages') {
             mobileSystem.markAllAsRead();
             phoneData.unreadCount = 0;
        }
    }
};


const openApp = (appId: string) => {
    activeApp.value = appId;
    syncPhoneData();
    
    const mobileSystem = props.engine.getModule('mobile');
    if (appId === 'messages' && mobileSystem) {
        mobileSystem.markAllAsRead();
        phoneData.unreadCount = 0;
    }
    if (appId === 'map') {
        const mapSystem = props.engine.getModule('map');
        if (mapSystem) {
            mapData.currentMap = mapSystem.getCurrentMap();
            mapData.locations = mapSystem.getLocationsByMap();
        }
    }
};

const handleTeleport = async (locId: string) => {
    const mapSystem = props.engine.getModule('map');
    if (mapSystem) {
        await mapSystem.teleport(locId);
        showPhone.value = false;
        await props.engine.next();
    }
};


</script>

<template>
    <div class="flat-layout-root" @mousedown="handleGlobalClick">
        <!-- 1. Loading Overlay -->
        <Transition name="fade">
            <div v-if="!isInitialized" class="loading-screen">
                <div class="loader"></div>
                <p class="loading-text">Initializing Story Engine...</p>
            </div>
        </Transition>

        <!-- 2. Background Layer -->
        <div class="game-bg" v-if="showMenu"></div>
        <div class="bg-overlay" v-show="showMenu"></div>

        <!-- 3. Main Menu -->
        <Transition name="slide-left">
            <main v-if="showMenu" class="menu-container">
                <header>
                    <h1 class="game-title">TellTell</h1>
                    <p class="game-subtitle">Interactive Story Driven Engine</p>
                </header>

                <ul class="menu-list">
                    <li class="menu-item" @click="startNewNarrative">
                        开始新篇章
                        <span>New Narrative</span>
                    </li>
                    <li class="menu-item disabled">
                        继续昨日故事
                        <span>Load Memory</span>
                    </li>
                    <li class="menu-item disabled">
                        感知调优
                        <span>Settings</span>
                    </li>
                    <li class="menu-item disabled">
                        离开模拟
                        <span>Exit Term</span>
                    </li>
                </ul>
            </main>
        </Transition>

        <!-- 4. In-Game Story Layer -->
        <div v-if="showGameLayer" class="game-layer" @click="handleDialogueClick">
            <div class="game-bg-layer" :style="getBgStyle()"></div>

            <!-- Floating Scene Text (Top Centered) - FORCED RENDER -->
            <div class="floating-scene-label" :key="frame.id + frame.screenText">
                <div class="label" v-if="frame.screenText || frame.id">
                    {{ frame.screenText || frame.id }}
                </div>
            </div>

            <!-- 4. Character Layer (Independent) -->
            <div class="character-container">
                <TransitionGroup name="portrait-fade">
                    <div v-for="charId in frame.characters" :key="charId" class="char-wrap">
                        <img :src="getPortraitUrl(charId, frame.look[charId])" class="char-portrait" />
                    </div>
                </TransitionGroup>
            </div>

            <!-- 5. Sidebar Tools -->
            <div class="game-sidebar-tools">
                <button class="tool-icon-btn phone-btn" @click.stop="togglePhone">📱</button>
            </div>

            <!-- Smartphone Overlay (Premium Handheld UI) -->
            <Transition name="phone-slide">
                <div v-if="showPhone" class="phone-overlay" @click.stop="showPhone = false">
                    <div class="smartphone" @click.stop>
                        <div class="phone-screen" :class="{ 'is-app-open': activeApp }">
                            <!-- Status Bar & Dynamic Island -->
                            <div class="status-bar">
                                <span>{{ currentTime }}</span>
                                <div class="status-icons">📶 🛜 🔋</div>
                            </div>

                            <!-- App Content Area -->
                            <div class="app-viewport">
                                <!-- Home Screen -->
                                <div v-if="!activeApp" class="home-screen">
                                    <div class="app-grid">
                                        <div v-if="phoneData.unlockedApps.includes('map')" class="app-icon" @click="openApp('map')">
                                            <div class="icon-bg map-app">🗺️</div>
                                            <span>地图</span>
                                        </div>
                                        <div v-if="phoneData.unlockedApps.includes('contact')" class="app-icon" @click="openApp('contact')">
                                            <div class="icon-bg contact-app">👥</div>
                                            <span>联系人</span>
                                        </div>
                                        <div v-if="phoneData.unlockedApps.includes('messages')" class="app-icon" @click="openApp('messages')">
                                            <div class="icon-bg msg-app">
                                                💬
                                                <div v-if="phoneData.unreadCount > 0" class="badge-dot"></div>
                                            </div>
                                            <span>简讯</span>
                                        </div>
                                        <div v-if="phoneData.unlockedApps.includes('phone')" class="app-icon" @click="openApp('phone')">
                                            <div class="icon-bg phone-app">📞</div>
                                            <span>电话</span>
                                        </div>
                                        <div class="app-icon" @click="openApp('notes')">
                                            <div class="icon-bg">📝</div>
                                            <span>备忘录</span>
                                        </div>
                                        <div class="app-icon" @click="openApp('settings')">
                                            <div class="icon-bg">⚙️</div>
                                            <span>系统</span>
                                        </div>
                                    </div>
                                    
                                    <!-- Modern Dock -->
                                    <div class="phone-dock">
                                        <div class="app-icon" @click="openApp('phone')">
                                            <div class="icon-bg phone-app">📞</div>
                                        </div>
                                        <div class="app-icon" @click="openApp('messages')">
                                            <div class="icon-bg msg-app">
                                                ✉️
                                                <div v-if="phoneData.unreadCount > 0" class="badge-dot"></div>
                                            </div>
                                        </div>
                                        <div class="app-icon" @click="openApp('browsing')">
                                            <div class="icon-bg">🌐</div>
                                        </div>
                                        <div v-if="phoneData.unlockedApps.includes('map')" class="app-icon" @click="openApp('map')">
                                            <div class="icon-bg map-app">📍</div>
                                        </div>
                                    </div>
                                </div>

                                <!-- Map App -->
                                <div v-else-if="activeApp === 'map'" class="map-app">
                                    <div class="app-header">
                                        <button @click="activeApp = null">←</button>
                                        <span>巡游地图</span>
                                    </div>
                                    <div class="map-view" :style="{ backgroundImage: mapData.currentMap?.background ? `url('/ui/map/${mapData.currentMap.background}')` : 'none' }">
                                        <div 
                                            v-for="loc in mapData.locations" 
                                            :key="loc.id" 
                                            class="map-pin"
                                            :class="{ 'locked': loc.lock }"
                                            :style="{ left: loc.position?.[0] + '%', top: loc.position?.[1] + '%' }"
                                            @click="handleTeleport(loc.id)"
                                        >
                                            <div class="pin-icon">📍</div>
                                            <div class="pin-label">{{ loc.name }}</div>
                                        </div>
                                    </div>
                                </div>

                                <!-- Messages App -->
                                <div v-else-if="activeApp === 'messages'" class="msg-app">
                                    <div class="app-header">
                                        <button @click="activeApp = null">←</button>
                                        <span>近期简讯</span>
                                    </div>
                                    <div class="msg-list">
                                        <div v-for="(msg, i) in phoneData.messages" :key="i" 
                                            class="msg-item" :class="{ 'msg-player': msg.isPlayer }">
                                            <div class="msg-sender" v-if="!msg.isPlayer">{{ msg.fromId }}</div>
                                            <div class="msg-bubble">{{ msg.text }}</div>
                                        </div>
                                        <div v-if="phoneData.messages.length === 0" class="empty-msg">没有任何简讯</div>
                                    </div>
                                </div>

                                <!-- Contact App -->
                                <div v-else-if="activeApp === 'contact'" class="contact-app">
                                    <div class="app-header">
                                        <button @click="activeApp = null">←</button>
                                        <span>通讯录</span>
                                    </div>
                                    <div class="contact-list">
                                        <div v-for="c in phoneData.contacts" :key="c.id" class="contact-item">
                                            <div class="contact-avatar">{{ c.alias.charAt(0) }}</div>
                                            <div class="contact-info">
                                                <div class="contact-name">{{ c.alias }}</div>
                                                <div class="contact-memo">{{ c.title }} - {{ c.memo }}</div>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <!-- Phone App -->
                                <div v-else-if="activeApp === 'phone'" class="phone-app">
                                    <div class="app-header">
                                        <button @click="activeApp = null">←</button>
                                        <span>电话记录</span>
                                    </div>
                                    <div class="call-history">
                                        <div v-for="call in phoneData.calls" :key="call.id" class="call-item">
                                            <div class="call-icon" :class="call.type">{{ call.type === 'incoming' ? '↙️' : '↗️' }}</div>
                                            <div class="call-main">
                                                <div class="call-name">{{ call.targetId }}</div>
                                                <div class="call-status">{{ call.status }}</div>
                                            </div>
                                        </div>
                                        <div v-if="phoneData.calls.length === 0" class="empty-msg">没有通话记录</div>
                                    </div>
                                </div>

                                <!-- Placeholder View -->
                                <div v-else class="generic-app">
                                    <div class="app-header">
                                        <button @click="activeApp = null">←</button>
                                        <span>{{ activeApp ? activeApp.toUpperCase() : 'APP' }}</span>
                                    </div>
                                    <div class="app-placeholder">
                                        <p>核心逻辑尚未就绪</p>
                                    </div>
                                </div>
                            </div>

                            <!-- Home indicator -->
                            <div class="phone-home-indicator" @click="activeApp = null"></div>
                        </div>
                    </div>
                </div>
            </Transition>

            <!-- 5. Dialogue System HUD (Z-Index 1000) -->
            <Transition name="fade">
                <div v-if="frame.text || frame.name || frame.choices.length > 0" class="dialogue-system">
                    <div class="dialogue-box" v-if="frame.text || frame.name">
                        <div v-if="frame.name" class="dialogue-name">{{ frame.name }}</div>
                        <div v-if="frame.text" class="dialogue-content">{{ frame.text }}</div>
                        <div class="dialogue-next-arrow" v-if="frame.choices.length === 0"></div>
                    </div>

                    <!-- Choices Overlay (Z-Index 1100) -->
                    <div v-if="frame.choices.length > 0" class="choice-container">
                        <div 
                            v-for="(choice, idx) in frame.choices" 
                            :key="idx" 
                            class="choice-btn" 
                            @click.stop="handleChoice(choice)"
                        >
                            {{ choice.text }}
                        </div>
                    </div>
                </div>
            </Transition>
        </div>

        <footer v-show="showMenu" class="version-info">
            VER 1.1.0 / POWERED BY VUE / ENJOY7ECH.TELLTELL
        </footer>
    </div>
</template>

<style scoped>
.fade-enter-active, .fade-leave-active { transition: opacity 1s; }
.fade-enter-from, .fade-leave-to { opacity: 0; }

.slide-left-enter-active { transition: all 1.2s ease-out; }
.slide-left-enter-from { opacity: 0; transform: translateX(-50px); }

.portrait-fade-enter-active { transition: all 0.5s cubic-bezier(0.18, 0.89, 0.32, 1.28); }
.portrait-fade-enter-from { opacity: 0; transform: translateY(20px) scale(0.95); }

.menu-item.disabled, .choice-btn.disabled {
    opacity: 0.3 !important;
    filter: grayscale(1);
    cursor: not-allowed;
    pointer-events: none;
    border-color: rgba(255,255,255,0.05) !important;
    background: rgba(0,0,0,0.4) !important;
}
</style>
