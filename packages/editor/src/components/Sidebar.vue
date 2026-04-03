<script setup lang="ts">
import { ref, computed } from 'vue';
import CharacterList from './CharacterList.vue';
import StoryTree from './StoryTree.vue';
import { FolderOpened, Pointer, MagicStick } from '@element-plus/icons-vue';

const props = defineProps<{
    characterIds: string[];
    characterProfiles: Map<string, any>;
    portraitUrls: Map<string, string>;
    folderGroups: Map<string, any[]>;
    directoryName: string;
    statusText: string;
}>();

defineEmits(['select-node', 'edit-profile', 'open-dir', 'add-folder', 'save', 'publish', 'play']);

const currentTab = ref('story');
const isLoaded = computed(() => props.directoryName !== "未选择任何文件夹");
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
            <div class="dir-display" v-if="isLoaded">
                <span class="label">PROJECT:</span> {{ directoryName }}
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
                            :folder-groups="folderGroups"
                            :character-profiles="characterProfiles"
                            @select-node="(node) => $emit('select-node', node)"
                            @add-folder="$emit('add-folder')"
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
    background: #ffffff;
    border-right: 1px solid #e2e8f0;
    display: flex;
    flex-direction: column;
    flex-shrink: 0;
    z-index: 10;
    font-family: 'Inter', sans-serif;
}

.sidebar-header {
    padding: 24px 20px;
    border-bottom: 1px solid #e2e8f0;
    display: flex;
    flex-direction: column;
}

.brand {
    font-weight: 800;
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

.dir-display .label { font-weight: 800; color: #94a3b8; margin-right: 8px; }

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
    font-weight: 800;
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
