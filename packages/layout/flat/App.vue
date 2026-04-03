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

const frame = reactive({
    dialog: { char: '', name: '', text: '', pic: '' },
    screen: { pic: '', text: '' },
    choices: [] as any[]
});

// --- 生命周期与事件监听 ---
onMounted(() => {
    // 1. 监听初始化
    props.engine.on('initialized', () => {
        isInitialized.value = true;
    });

    // 2. 监听帧渲染
    props.engine.on('render', (newFrame: any) => {
        if (newFrame.dialog) {
            frame.dialog.char = newFrame.dialog.char || '';
            frame.dialog.text = newFrame.dialog.text || '';
            frame.dialog.pic = newFrame.dialog.pic || '';
            
            // 使用引擎方法获取展示名称
            frame.dialog.name = props.engine.getCharacterName(frame.dialog.char);
        }
        if (newFrame.screen) {
            frame.screen.pic = newFrame.screen.pic || '';
            frame.screen.text = newFrame.screen.text || '';
        }
        frame.choices = newFrame.choice || [];
    });
});

// --- UI 交互方法 ---
const startNewNarrative = async () => {
    showMenu.value = false;
    showGameLayer.value = true;
    await props.engine.next();
};

const handleDialogueClick = () => {
    if (frame.choices.length === 0) {
        props.engine.next();
    }
};

const handleChoice = async (choice: any) => {
    // 1. 执行选项附带的 Action (可能包含跳转逻辑 Engine.startStoryNode)
    if (choice.action?.length > 0) {
        await props.engine.executeActions(choice.action);
    }
    
    frame.choices = [];
};

const getPortraitUrl = (char: string, pic: string) => {
    return `/character/${char}/portrait/${pic}`;
};

const getBgStyle = () => {
    if (frame.screen.pic) {
        return { backgroundImage: `url('/scene/${frame.screen.pic}')` };
    }
    return { backgroundColor: '#000' };
};
</script>

<template>
    <div class="flat-layout-root">
        <!-- 1. Loading Overlay -->
        <Transition name="fade">
            <div v-if="!isInitialized" class="loading-screen">
                <div class="loader"></div>
                <p class="loading-text">Initializing Story Engine...</p>
            </div>
        </Transition>

        <!-- 2. Background Layer -->
        <div class="game-bg" :class="{ 'hidden': !showMenu }"></div>
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

            <!-- Floating Scene Text (Top Right) -->
            <Transition name="fade">
                <div v-if="frame.screen.text" class="floating-scene-label">
                    <div class="label">
                        {{ frame.screen.text }}
                    </div>
                </div>
            </Transition>



            <!-- Dialogue System -->
            <div 
                v-if="frame.dialog.text || frame.dialog.name || frame.choices.length > 0" 
                class="dialogue-system"
            >
                <div class="dialogue-box" v-if="frame.dialog.text">
                    <div class="dialogue-name" v-if="frame.dialog.name">{{ frame.dialog.name }}</div>
                    <div class="dialogue-content">{{ frame.dialog.text }}</div>
                    <!-- Character Portrait -->
                    <div class="character-container">
                        <Transition name="portrait-fade">
                            <img 
                                v-if="frame.dialog.pic" 
                                :key="frame.dialog.pic"
                                :src="getPortraitUrl(frame.dialog.char, frame.dialog.pic)" 
                                class="char-portrait" 
                            />
                        </Transition>
                    </div>
                    <div class="dialogue-next-arrow" v-if="frame.choices.length === 0"></div>
                </div>


                <!-- Choices Overlay -->
                <div class="choice-container" v-if="frame.choices.length > 0">
                    <div 
                        v-for="(choice, idx) in frame.choices" 
                        :key="idx" 
                        class="choice-btn" 
                        :class="{ 'disabled': !props.engine.judgeSatisfy(choice.requirement) }"
                        @click.stop="handleChoice(choice)"
                    >
                        {{ choice.text }}
                    </div>
                </div>
            </div>
        </div>

        <footer v-show="showMenu" class="version-info">
            VER 1.1.0 / POWERED BY VUE / ENJOY7ECH.TELLTELL
        </footer>
    </div>
</template>

<style scoped>
/* 继承之前的 style.css 逻辑，但可以使用 Vue 的 scoped 特性 */
/* 这里为了简洁，可以直接引用之前的全局样式，并添加 Vue 动画 */

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
