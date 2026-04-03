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
    dialog: { char: '...', text: '这是一个充满未知的起点。按下任意键或点击开始。', pic: '' },
    screen: { pic: '' },
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
            frame.dialog.char = newFrame.dialog.char;
            frame.dialog.text = newFrame.dialog.text;
            frame.dialog.pic = newFrame.dialog.pic;
        }
        if (newFrame.screen) {
            frame.screen.pic = newFrame.screen.pic;
        }
        frame.choices = newFrame.choice || [];
    });
});

// --- UI 交互方法 ---
const startNewNarrative = async () => {
    showMenu.value = false;
    showGameLayer.value = true;
    await props.engine.playNext();
};

const handleDialogueClick = () => {
    if (frame.choices.length === 0) {
        props.engine.playNext();
    }
};

const handleChoice = (choice: any) => {
    // 这里可以处理选项逻辑 (如执行 choice.action)
    frame.choices = []; // 清空选项
    props.engine.playNext();
};

const getPortraitUrl = (char: string, pic: string) => {
    return `/assets/character/${char}/portrait/${pic}.webp`;
};

const getBgStyle = () => {
    if (frame.screen.pic) {
        return { backgroundImage: `url('/assets/scene/${frame.screen.pic}.webp')` };
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
        <div v-if="showGameLayer" class="game-layer">
            <div class="game-bg-layer" :style="getBgStyle()"></div>

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

            <!-- Dialogue System -->
            <div class="dialogue-system" @click="handleDialogueClick">
                <div class="dialogue-box">
                    <div class="dialogue-name">{{ frame.dialog.char }}</div>
                    <div class="dialogue-content">{{ frame.dialog.text }}</div>
                    <div class="dialogue-next-arrow" v-if="frame.choices.length === 0"></div>
                </div>

                <!-- Choices Overlay -->
                <div class="choice-container" v-if="frame.choices.length > 0">
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

/* 禁用状态 */
.menu-item.disabled {
    opacity: 0.3;
    cursor: not-allowed;
}
.menu-item.disabled:hover {
    transform: none;
    color: var(--text-muted);
}
</style>
