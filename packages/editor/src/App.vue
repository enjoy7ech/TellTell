<script setup lang="ts">
import { onMounted, reactive, markRaw, provide, computed } from 'vue';
import Sidebar from './components/Sidebar.vue';
import Toolbar from './components/Toolbar.vue';
import GraphCanvas from './components/GraphCanvas.vue';
import PropertyPanel from './components/PropertyPanel.vue';
import FramePopover from './components/FramePopover.vue';
import RelationshipGraph from './components/RelationshipGraph.vue';
import AISettingsDialog from './components/AISettingsDialog.vue';
import { ScriptEditorService } from './services/ScriptEditorService';
import { GeminiService } from './services/GeminiService';
import { Connection, View, RefreshRight, SemiSelect } from '@element-plus/icons-vue';

// Global Reactive State
const state = reactive({
    node: null as any,
    profile: null as any,
    profileId: "" as string,
    characterIds: [] as string[],
    portraitHandles: new Map(),
    sceneHandles: new Map(),
    characterProfiles: new Map(),
    
    // Asset Previews (Shared Cache)
    portraitUrls: reactive(new Map<string, string>()),
    sceneUrls: reactive(new Map<string, string>()),
    
    directoryName: "未选择任何文件夹",
    statusText: "就绪",
    hasDirectory: false,
    previewUrl: "http://localhost:5173",
    showPreview: false,
    showGraph: false,
    showAISettings: false,
    autoExpandFrameIndex: -1,
    
    // Graph State (Vue Flow)
    nodes: [] as any[],
    edges: [] as any[],
    
    // Popover State
    popover: {
        visible: false,
        node: null as any,
        index: -1,
        x: 0,
        y: 0
    },
    
    // Gemini AI
    geminiApiKey: localStorage.getItem("gemini_api_key") || "",
    geminiModel: localStorage.getItem("gemini_model") || "gemini-2.5-flash",
    geminiImageModel: localStorage.getItem("gemini_image_model") || "gemini-3-pro-image-preview",
    geminiService: null as any,
    
    // Services
    editorService: null as any,
});

// Provide nodes to all nested components to avoid prop drilling
provide('all-nodes', computed(() => state.nodes));
provide('state', state);

onMounted(async () => {
    const service = new ScriptEditorService(state);
    state.editorService = markRaw(service);
    
    if (state.geminiApiKey) {
        state.geminiService = markRaw(new GeminiService(state.geminiApiKey, state.geminiModel, state.geminiImageModel));
    }
});

function handleSave() {
    state.editorService?.triggerAutoSave();
}

function handlePublish() {
    state.editorService?.publishBundle();
}

function handleOpenDir() {
    state.editorService?.selectDirectory();
}

function handlePlay() {
    state.editorService?.playPreview();
}

</script>

<template>
    <div id="app-root">
        <!-- Sidebar -->
        <Sidebar 
            :character-ids="state.characterIds"
            :character-profiles="state.characterProfiles"
            :portrait-urls="state.portraitUrls"
            :directory-name="state.directoryName"
            :status-text="state.statusText"
            @select-node="(node) => state.editorService.selectNode(node)"
            @edit-profile="(id) => state.editorService.showCharacterProfile(id)"
            @open-dir="handleOpenDir"
            @save="handleSave"
            @publish="handlePublish"
            @play="handlePlay"
            @open-ai-settings="state.showAISettings = true"
        />

        <!-- Main Workspace -->
        <main class="editor-container">
            <Toolbar 
                :status-text="state.statusText"
                :directory-name="state.directoryName"
                @save="handleSave"
                @publish="handlePublish"
                @play="handlePlay"
                @add-node="() => state.editorService?.addNode()"
            />

            <!-- Vue Flow Canvas Area -->
            <GraphCanvas ref="graphCanvasRef" :state="state" />

            <!-- Vertical Workspace Tools (Purified) -->
            <div class="vertical-toolbar">
                <el-tooltip content="查看人物关系网" placement="left">
                    <button class="tool-btn" @click="state.showGraph = true">
                        <el-icon><Connection /></el-icon>
                        <span class="label">关系</span>
                    </button>
                </el-tooltip>
                <div class="separator"></div>
                <!-- Future tools can go here -->
            </div>

            <!-- Live Preview Mini Window (Purified Premium Style) -->
            <div v-if="state.hasDirectory && state.showPreview" class="live-preview-window">
                <div class="window-header">
                    <div class="header-left">
                        <el-icon class="indicator"><View /></el-icon>
                        <span class="title">LIVE PREVIEW</span>
                    </div>
                    <div class="actions">
                        <el-button link :icon="RefreshRight" @click="() => { const ifr = $refs.previewIframe as any; if (ifr) ifr.src = state.previewUrl; }" />
                        <el-button link :icon="SemiSelect" @click="() => state.showPreview = false" />
                    </div>
                </div>
                <div class="iframe-container">
                    <iframe ref="previewIframe" :src="state.previewUrl" border="0"></iframe>
                </div>
            </div>

            <!-- Preview Toggle Button (When closed) -->
            <button v-if="state.hasDirectory && !state.showPreview" class="preview-mini-btn" @click="state.showPreview = true">
                <el-icon><View /></el-icon> 显示预览
            </button>
        </main>

        <!-- Right Panel (Purified) -->
        <aside class="property-panel" :class="{ hidden: !state.node && !state.profile }">
             <PropertyPanel 
                v-if="state.node || state.profile"
                :state="state"
                :on-save="handleSave"
            />
        </aside>

        <!-- Modals -->
        <FramePopover v-if="state.popover.visible"
            :state="state"
            @close="state.popover.visible = false"
            @change="handleSave"
        />

        <RelationshipGraph v-if="state.showGraph" 
            :character-ids="state.characterIds"
            :character-profiles="state.characterProfiles"
            :portrait-handles="state.portraitHandles"
            :get-image-url="state.editorService?.getImageUrl"
            @close="state.showGraph = false"
        />

        <AISettingsDialog 
            v-model:visible="state.showAISettings"
        />
    </div>
</template>

<style>
#app-root {
    display: flex;
    flex-flow: row nowrap;
    width: 100vw;
    height: 100vh;
    overflow: hidden;
    background-color: var(--bg-color);
}

.editor-container {
    flex: 1;
    min-width: 0;
    position: relative;
    display: flex;
    flex-direction: column;
}

/* Live Preview Window - Purified Style */
.live-preview-window {
    position: absolute;
    bottom: 30px;
    right: 30px;
    width: 430px;
    zoom: 0.6;
    height: 932px; /* Standard Mobile Ratio */
    background: #000;
    border: 1px solid var(--border-color);
    border-radius: var(--radius-lg);
    box-shadow: var(--shadow-lg);
    overflow: hidden;
    display: flex;
    flex-direction: column;
    z-index: 100;
    animation: slideUp 0.5s cubic-bezier(0.2, 0.8, 0.2, 1);
}

.window-header {
    background: #1a1a1a;
    padding: 10px 16px;
    display: flex;
    justify-content: space-between;
    align-items: center;
    border-bottom: 1px solid #222;
}

.header-left {
    display: flex;
    align-items: center;
    gap: 8px;
}

.window-header .indicator { color: var(--accent-color); font-size: 0.9rem; }

.window-header .title {
    font-size: 0.65rem;
    font-weight: 900;
    color: var(--text-dim);
    letter-spacing: 1.5px;
}

.iframe-container {
    flex: 1;
    background: #000;
    position: relative;
}

.live-preview-window iframe {
    width: 100%;
    height: 100%;
    border: none;
}

.preview-mini-btn {
    position: absolute;
    bottom: 30px;
    right: 30px;
    background: var(--accent-color);
    color: white;
    border: none;
    padding: 10px 20px;
    border-radius: 30px;
    font-size: 0.75rem;
    font-weight: 800;
    box-shadow: 0 4px 20px var(--accent-glow);
    cursor: pointer;
    z-index: 99;
    display: flex;
    align-items: center;
    gap: 8px;
    transition: all 0.2s;
}

.preview-mini-btn:hover { transform: translateY(-2px); filter: brightness(1.1); }

@keyframes slideUp {
    from { opacity: 0; transform: translateY(40px) scale(0.9); }
    to { opacity: 1; transform: translateY(0) scale(1); }
}

/* Vertical Toolbar Purified */
.vertical-toolbar {
    position: absolute;
    right: 30px;
    top: 50%;
    transform: translateY(-50%);
    backdrop-filter: blur(20px);
    border: 1px solid var(--border-color);
    border-radius: var(--radius-lg);
    padding: 10px;
    display: flex;
    flex-direction: column;
    gap: 12px;
    box-shadow: var(--shadow-md);
    z-index: 50;
}

.tool-btn {
    width: 44px;
    height: 44px;
    border-radius: var(--radius-md);
    background: transparent;
    border: none;
    color: var(--text-dim);
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
    gap: 2px;
}

.tool-btn .el-icon { font-size: 1.2rem; }

.tool-btn .label { 
    font-size: 0.55rem; 
    font-weight: 800;
    text-transform: uppercase;
    opacity: 0.6;
}

.tool-btn:hover {
    background: rgba(255, 255, 255, 0.05);
    color: var(--accent-color);
}

.tool-btn:hover .label { opacity: 1; }

.vertical-toolbar .separator {
    height: 1px;
    background: var(--border-color);
    margin: 0 4px;
}
</style>
