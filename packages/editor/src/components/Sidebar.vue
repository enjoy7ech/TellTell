<script setup lang="ts">
import { ref, computed, reactive, inject, watch } from 'vue';
import CharacterList from './CharacterList.vue';
import StoryTree from './StoryTree.vue';
import { FolderOpened, Pointer, MagicStick } from '@element-plus/icons-vue';

const props = defineProps<{
    characterIds: string[];
    characterProfiles: Map<string, any>;
    portraitUrls: Map<string, string>;
    directoryName: string;
    statusText: string;
}>();

defineEmits(['select-node', 'edit-profile', 'open-dir', 'save', 'publish', 'play', 'open-ai-settings']);

const globalState = inject<any>('state');
const currentTab = ref('story');
const isLoaded = computed(() => props.directoryName !== "未选择任何文件夹");

const state = reactive({
    geminiApiKey: localStorage.getItem("gemini_api_key") || "",
    geminiModel: localStorage.getItem("gemini_model") || "gemini-2.5-flash",
    geminiImageModel: localStorage.getItem("gemini_image_model") || "gemini-3-pro-image-preview",
    availableModels: [] as any[],
    usageStats: null as any
});

// Model list watcher
watch(() => globalState?.geminiService, async (newService) => {
    if (newService) {
        try {
            const models = await newService.listModels();
            state.availableModels = models.filter((m: any) => 
                (m.supportedGenerationMethods?.includes('generateContent') || 
                 m.name?.includes('gemini')) &&
                !m.name?.includes('embedding')
            );
            console.log("Found usable Gemini models:", state.availableModels.length);
        } catch (e) {
            console.warn("Failed to fetch Gemini models:", e);
        }
    }
}, { immediate: true });

function handleApiKeyChange(val: string) {
    localStorage.setItem("gemini_api_key", val);
    window.location.reload();
}

function handleModelChange(val: string) {
    localStorage.setItem("gemini_model", val);
    if (globalState.geminiService) {
        globalState.geminiService.updateTextModel(val);
    }
}

function handleImageModelChange(val: string) {
    localStorage.setItem("gemini_image_model", val);
    if (globalState.geminiService) {
        globalState.geminiService.updateImageModel(val);
    }
}
</script>


<template>
    <aside class="sidebar" :class="{ 'is-not-loaded': !isLoaded }">
        <header class="sidebar-header">
            <span class="brand">TellTell</span>
            <span class="sub">Narrative Editor</span>
        </header>
        
        <!-- Directory Management Area -->
        <div class="sidebar-padding top-area">
            <el-button 
                class="btn-primary-large full-width" 
                :class="{ 'pulsing': !isLoaded }" 
                @click="$emit('open-dir')"
                type="primary"
            >
                <el-icon v-if="isLoaded"><FolderOpened /></el-icon>
                <el-icon v-else><Pointer /></el-icon>
                {{ isLoaded ? '更换素材目录' : '开始编辑 (选择 Assets)' }}
            </el-button>
            
            <!-- Gemini AI Config -->
            <div class="gemini-config" style="margin-top: 15px;">
                <div class="label-row" style="font-size: 0.65rem; color: #94a3b8; margin-bottom: 5px; font-weight: 800;">GEMINI AI CONFIG</div>
                <div class="gemini-grid" style="display: flex; flex-direction: column; gap: 8px;">
                    <el-input 
                        v-model="state.geminiApiKey" 
                        type="password" 
                        placeholder="API Key..." 
                        size="small"
                        show-password
                        @change="handleApiKeyChange"
                    />
                    <el-select 
                        v-model="state.geminiModel" 
                        placeholder="Text Model" 
                        size="small"
                        @change="handleModelChange"
                        style="width: 100%;"
                    >
                        <template v-if="state.availableModels.length > 0">
                            <el-option 
                                v-for="m in state.availableModels" 
                                :key="m.name" 
                                :label="m.displayName || m.name.split('/').pop() || m.name" 
                                :value="m.name.replace('models/', '')" 
                            />
                        </template>
                        <template v-else>
                            <el-option label="Gemini 2.5 Flash" value="gemini-2.5-flash" />
                            <el-option label="Gemini 2.5 Pro" value="gemini-2.5-pro" />
                            <el-option label="Gemini 3.1 Pro" value="gemini-3.1-pro-preview" />
                            <el-option label="Gemini 2.0 Flash" value="gemini-2.0-flash-001" />
                        </template>
                    </el-select>
                    
                    <el-select 
                        v-model="state.geminiImageModel" 
                        placeholder="Image Model" 
                        size="small"
                        @change="handleImageModelChange"
                        style="width: 100%;"
                    >
                        <el-option label="Nano Banana Pro (Gemini 3)" value="gemini-3-pro-image-preview" />
                        <el-option label="Nano Banana (Gemini 2.5)" value="gemini-2.5-flash-image" />
                        <el-option label="Nano Banana 2 (3.1 Flash)" value="gemini-3.1-flash-image-preview" />
                        <el-divider />
                        <el-option label="Imagen 4.0 Standard" value="imagen-4.0-generate-001" />
                    </el-select>

                    <el-button 
                        size="small" 
                        type="primary" 
                        plain 
                        :icon="MagicStick"
                        @click="$emit('open-ai-settings')"
                        style="width: 100%; font-weight: 700; border-style: dashed;"
                    >
                        AI 创作深度设定
                    </el-button>
                </div>
            </div>
        </div>

        <!-- Conditional Tab Area -->
        <div v-if="isLoaded" class="tabbed-container">
            <el-tabs v-model="currentTab" class="sidebar-tabs" stretch>
                 <el-tab-pane label="剧情" name="story">
                    <template #label>
                        <span class="tab-label-custom">📖 剧情</span>
                    </template>
                    <div class="tab-scroll-area">
                        <StoryTree 
                            :character-profiles="characterProfiles"
                            :state="state"
                            @select-node="(node) => $emit('select-node', node)"
                        />
                    </div>
                </el-tab-pane>
                <el-tab-pane label="角色" name="characters">
                    <template #label>
                        <span class="tab-label-custom">👥 角色</span>
                    </template>
                    <div class="tab-scroll-area">
                        <CharacterList 
                            :character-ids="characterIds"
                            :character-profiles="characterProfiles"
                            :portrait-urls="portraitUrls"
                            @edit-profile="(id) => $emit('edit-profile', id)"
                        />
                    </div>
                </el-tab-pane>
            </el-tabs>
        </div>

        <!-- Placeholder when not loaded -->
        <div v-else class="welcome-placeholder">
            <div class="glow-bg"></div>
            <div class="icon-container">
                <el-icon size="48"><MagicStick /></el-icon>
            </div>
            <p>请选择包含角色和场景的 Assets 目录以开始工作</p>
        </div>
    </aside>
</template>

<style scoped>
.sidebar {
    width: 320px;
    height: 100%; /* Force height to match parent/viewport */
    background: #ffffff;
    border-right: 1px solid #e2e8f0;
    display: flex;
    flex-direction: column;
    flex-shrink: 0;
    z-index: 10;
    font-family: 'Inter', sans-serif;
    overflow: hidden; /* Prevent sidebar itself from scrolling */
}

.sidebar-header {
    padding: 24px 20px;
    border-bottom: 1px solid #e2e8f0;
    display: flex;
    flex-direction: column;
}

.brand {
    font-weight: 700;
    font-size: 1.4rem;
    color: #0f172a;
    letter-spacing: -1px;
    line-height: 1;
}

.sub {
    font-size: 0.65rem;
    text-transform: uppercase;
    letter-spacing: 2px;
    color: #94a3b8;
    margin-top: 4px;
    font-weight: 800;
}

.sidebar-padding { padding: 20px; }
.top-area { background: #f8fafc; border-bottom: 1px solid #e2e8f0; }

.full-width { width: 100%; }

.btn-primary-large {
    height: 48px;
    font-weight: 800;
    font-size: 0.9rem;
    border-radius: 12px;
    box-shadow: 0 4px 12px rgba(59, 130, 246, 0.2);
}

.dir-display {
    font-size: 0.7rem;
    margin-top: 12px;
    word-break: break-all;
    font-family: 'JetBrains Mono', monospace;
    background: #f1f5f9;
    padding: 8px 12px;
    border-radius: 8px;
    color: #475569;
    border: 1px solid #e2e8f0;
}

/* Premium Usage Card Styles */
.premium-usage-card {
    margin-top: 15px;
    background: linear-gradient(135deg, #1e293b 0%, #0f172a 100%);
    border-radius: 16px;
    padding: 16px;
    color: white;
    box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.3), 0 4px 6px -2px rgba(0, 0, 0, 0.05);
    border: 1px solid rgba(255, 255, 255, 0.05);
    overflow: hidden;
    position: relative;
}

.premium-usage-card::before {
    content: '';
    position: absolute;
    top: -50%;
    left: -50%;
    width: 200%;
    height: 200%;
    background: radial-gradient(circle, rgba(59, 130, 246, 0.05) 0%, transparent 70%);
    pointer-events: none;
}

.card-header {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-bottom: 12px;
}

.status-pulse {
    width: 6px;
    height: 6px;
    background: #10b981;
    border-radius: 50%;
    box-shadow: 0 0 8px #10b981;
    animation: status-glow 2s infinite;
}

@keyframes status-glow {
    0% { opacity: 0.4; }
    50% { opacity: 1; transform: scale(1.2); }
    100% { opacity: 0.4; }
}

.api-label {
    font-size: 0.55rem;
    font-weight: 900;
    letter-spacing: 1.5px;
    color: #64748b;
}

.stats-main {
    display: flex;
    justify-content: space-between;
    align-items: flex-end;
    margin-bottom: 16px;
}

.main-val {
    display: flex;
    flex-direction: column;
}

.v-num {
    font-size: 1.4rem;
    font-weight: 850;
    line-height: 1;
    font-family: 'JetBrains Mono', monospace;
    background: linear-gradient(to right, #ffffff, #94a3b8);
    -webkit-background-clip: text;
    background-clip: text;
    -webkit-text-fill-color: transparent;
}

.v-unit {
    font-size: 0.5rem;
    font-weight: 900;
    color: #3b82f6;
    margin-top: 4px;
    letter-spacing: 1px;
}

.sub-info {
    text-align: right;
    display: flex;
    flex-direction: column;
    gap: 2px;
}

.info-item {
    font-size: 0.55rem;
    display: flex;
    gap: 4px;
    justify-content: flex-end;
}

.i-label { color: #64748b; font-weight: 800; }
.i-val { color: #e2e8f0; font-weight: 700; }

.progress-wrapper {
    margin-top: 8px;
}

.progress-track {
    height: 6px;
    background: rgba(255, 255, 255, 0.05);
    border-radius: 3px;
    overflow: hidden;
}

.progress-fill {
    height: 100%;
    background: linear-gradient(90deg, #3b82f6, #a855f7);
    border-radius: 3px;
    transition: width 1s cubic-bezier(0.34, 1.56, 0.64, 1);
}

.progress-markers {
    display: flex;
    justify-content: space-between;
    margin-top: 6px;
    font-size: 0.5rem;
    font-weight: 800;
    color: #475569;
}

.dir-display .label { font-weight: 800; color: #94a3b8; margin-right: 8px; }

/* Tab Switcher - Ultimate Absolute Fill Strategy */
.tabbed-container {
    flex: 1;
    position: relative; /* Anchor for absolute tabs */
    overflow: hidden;
    min-height: 0;
    background: white;
}

.sidebar-tabs {
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    display: flex;
    flex-direction: column;
}

:deep(.el-tabs__header) {
    margin: 0;
    flex-shrink: 0;
    background: #ffffff;
    border-bottom: 1px solid #e2e8f0;
}

:deep(.el-tabs__content) {
    flex: 1 !important;
    display: block !important;
    overflow-y: auto !important; /* This is the ONLY scroll area */
    overflow-x: hidden !important;
    background: #f8fafc;
    position: relative;
}

:deep(.el-tab-pane) {
    height: auto !important; /* Allow panel to flow */
    min-height: 100%;
}

.tab-scroll-area {
    /* Transparent container, relying on el-tabs__content to scroll */
    min-height: 100%;
    display: flex;
    flex-direction: column;
}

.tab-label-custom {
    display: flex;
    align-items: center;
    gap: 6px;
    letter-spacing: 1px;
}

.pulsing {
    animation: pulse-glow 2s infinite;
}

@keyframes pulse-glow {
    0% { box-shadow: 0 0 0 0 rgba(52, 152, 219, 0.4); }
    70% { box-shadow: 0 0 0 10px rgba(52, 152, 219, 0); }
    100% { box-shadow: 0 0 0 0 rgba(52, 152, 219, 0); }
}

/* Tab Switcher */
.tabbed-container {
    flex: 1;
    display: flex;
    flex-direction: column;
    overflow: hidden;
}

.sidebar-tabs {
    flex: 1;
    display: flex;
    flex-direction: column;
}

:deep(.el-tabs__header) {
    margin: 0;
    background: #ffffff;
    border-bottom: 1px solid #e2e8f0;
}

:deep(.el-tabs__nav-wrap::after) {
    display: none;
}

:deep(.el-tabs__active-bar) {
    background-color: #3b82f6;
    height: 3px;
    border-radius: 3px;
}

:deep(.el-tabs__item) {
    height: 50px;
    font-weight: 500; /* Normalized from 800 */
    font-size: 0.75rem;
    color: #94a3b8;
}

:deep(.el-tabs__item.is-active) {
    color: #3b82f6;
}

:deep(.el-tabs__content) {
    flex: 1;
    overflow: hidden;
}

:deep(.el-tab-pane) {
    height: 100%;
}

.tab-scroll-area {
    height: 100%;
    overflow-y: auto;
}

.tab-label-custom {
    display: flex;
    align-items: center;
    gap: 6px;
    letter-spacing: 1px;
}

/* Welcome Placeholder */
.welcome-placeholder {
    flex: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 40px;
    text-align: center;
    color: #94a3b8;
    position: relative;
}

.icon-container {
    padding: 24px;
    background: #f8fafc;
    border-radius: 50%;
    margin-bottom: 24px;
    border: 1px solid #e2e8f0;
    color: #3b82f6;
    z-index: 2;
}

.welcome-placeholder p {
    font-size: 0.85rem;
    font-weight: 700;
    line-height: 1.6;
    max-width: 200px;
}
</style>
