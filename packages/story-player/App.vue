<script setup lang="ts">
import { ref } from 'vue';
import './index.css';

// 引入逻辑模块 (Composables)
import { useStoryEngine, resolveAssetPath } from './src/composables/useStoryEngine';
import { usePhoneSystem } from './src/composables/usePhoneSystem';

// 引入展示组件 (Components)
import SceneLabel from './src/components/SceneLabel.vue';
import DialogueHUD from './src/components/DialogueHUD.vue';
import SmartphoneUI from './src/components/SmartphoneUI.vue';
import CharacterLayer from './src/components/CharacterLayer.vue';

const props = defineProps<{
    engine: any;
}>();

// --- 模块挂载 ---
const engineInstance = props.engine;
console.log("[App] Initializing Modules with Engine:", engineInstance ? "OK" : "MISSING");

const { frame, isInitialized } = useStoryEngine(engineInstance);
const { 
    showPhone, activeApp, currentTime, phoneData, mapData, 
    togglePhone, openApp, handleTeleport 
} = usePhoneSystem(engineInstance);

// --- 核心全局状态 ---
const showMenu = ref(true);
const showGameLayer = ref(false);

// --- 全局交互逻辑 ---
const startNewNarrative = async () => {
    console.log("[App] Starting New Narrative...");
    showMenu.value = false;
    showGameLayer.value = true;
    try {
        await props.engine.startStoryNode('intro');
        await props.engine.next();
        console.log("[App] Engine Pushed to First Frame.");
    } catch (e) {
        console.error("[App] Failed to start narrative:", e);
    }
};

const handleDialogueClick = () => {
    if (frame.choices.length === 0) {
        props.engine.next();
    }
};

const handleGlobalClick = () => {
    if (showGameLayer.value && !showPhone.value) {
        handleDialogueClick();
    }
};

const onChoiceClick = async (choice: any) => {
    if (choice.action?.length > 0) {
        await props.engine.executeActions(choice.action);
    }
    await props.engine.next();
};

const getBgStyle = () => {
    if (frame.screenPic) {
        return { backgroundImage: `url('/scene/${frame.screenPic}')` };
    }
    return { backgroundColor: '#000' };
};
</script>

<template>
    <div class="flat-layout-root" @mousedown="handleGlobalClick">
        <!-- 1. 加载层 -->
        <Transition name="fade">
            <div v-if="!isInitialized" class="loading-screen">
                <div class="loader"></div>
                <p class="loading-text">Initializing Story Engine...</p>
            </div>
        </Transition>

        <!-- 2. 主菜单层 -->
        <Transition name="slide-left">
            <main v-if="showMenu" class="menu-container">
                <header>
                    <h1 class="game-title">TellTell</h1>
                    <p class="game-subtitle">Interactive Story Driven Engine</p>
                </header>
                <ul class="menu-list">
                    <li class="menu-item" @click="startNewNarrative">开始新篇章<span>New Narrative</span></li>
                    <li class="menu-item disabled">继续昨日故事<span>Load Memory</span></li>
                    <li class="menu-item disabled">离开模拟<span>Exit Term</span></li>
                </ul>
            </main>
        </Transition>

        <!-- 3. 游戏核心层 -->
        <div v-if="showGameLayer" class="game-layer" :class="{ 'is-blurred': showPhone }" @click="handleDialogueClick">
            <div class="game-bg-layer" :style="getBgStyle()"></div>

            <!-- [模块化组件] 场景文字 -->
            <SceneLabel :frame="frame" />

            <!-- [模块化组件] 立绘层 -->
            <CharacterLayer 
                :characters="frame.characters" 
                :look="frame.look" 
                :resolveAssetPath="resolveAssetPath" 
            />

            <!-- 侧边栏工具 -->
            <div class="game-sidebar-tools">
                <button class="tool-icon-btn phone-btn" @click.stop="togglePhone">📱</button>
            </div>

            <!-- [模块化组件] 对话交互 Hud (手机开启时隐藏) -->
            <DialogueHUD v-show="!showPhone" :frame="frame" :engine="engine" @choiceClick="onChoiceClick" />
        </div>

        <!-- [模块化组件] 手机界面 (放在 game-layer 外部，防止被同步虚化) -->
        <SmartphoneUI 
            :show="showPhone" 
            :currentTime="currentTime"
            :phoneData="phoneData"
            :mapData="mapData"
            :activeApp="activeApp"
            @close="showPhone = false"
            @openApp="openApp"
            @teleport="handleTeleport"
        />

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
</style>
