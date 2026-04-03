<script setup lang="ts">
import { Plus } from '@element-plus/icons-vue';

defineProps<{
    folderGroups: Map<string, any[]>;
    characterProfiles: Map<string, any>;
}>();

defineEmits(['select-node', 'add-folder']);
</script>

<template>
    <div class="story-tree-container">
        <header class="tree-header">
            <span>章节大纲 / 资产管理</span>
            <el-button 
                size="small" 
                type="primary" 
                plain 
                :icon="Plus" 
                @click="$emit('add-folder')"
                class="btn-micro"
            >
                新章节
            </el-button>
        </header>

        <div class="tree-list">
            <div v-for="[folder, items] in folderGroups" :key="folder" class="folder-group">
                <div class="folder-header">
                    <span class="folder-icon">📁</span>
                    <span class="folder-name">{{ folder }}</span>
                    <span class="badge">{{ items.length }}</span>
                </div>
                <div class="node-list">
                    <div 
                        v-for="node in items" 
                        :key="node.properties.id" 
                        class="node-item"
                        @click="$emit('select-node', node)"
                    >
                        <div class="node-meta">
                            <span class="node-prefix">{{ characterProfiles.get(node.properties.display?.[0]?.dialog?.char)?.name || "?" }}</span>
                            <span class="node-id">{{ node.properties.id }}</span>
                        </div>
                        <div class="node-preview">{{ node.properties.display?.[0]?.dialog?.text || "(No Text)" }}</div>
                    </div>
                </div>
            </div>
            
            <div v-if="folderGroups.size === 0" class="empty-state">
                当前项目暂无剧情节点
            </div>
        </div>
    </div>
</template>

<style scoped>
.story-tree-container {
    padding: 15px;
    flex: 1;
    display: flex;
    flex-direction: column;
}

.tree-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    font-size: 0.7rem;
    font-weight: 800;
    color: #94a3b8;
    text-transform: uppercase;
    letter-spacing: 1px;
    margin-bottom: 16px;
}

.btn-micro {
    font-weight: 800 !important;
    border-radius: 6px !important;
}

.tree-list {
    flex: 1;
    overflow-y: auto;
}

.folder-group {
    margin-bottom: 24px;
}

.folder-header {
    background: #f8fafc;
    padding: 10px 14px;
    border-radius: 8px;
    border: 1px solid #e2e8f0;
    font-size: 0.85rem;
    font-weight: 800;
    color: #1e293b;
    margin-bottom: 8px;
    display: flex;
    align-items: center;
    gap: 10px;
}

.folder-icon { font-size: 1rem; opacity: 0.8; }
.folder-name { flex: 1; }
.badge { font-size: 0.7rem; color: #94a3b8; font-weight: 800; }

.node-list {
    padding-left: 20px;
    border-left: 2px solid #f1f5f9;
}

.node-item {
    padding: 8px 12px;
    font-size: 0.85rem;
    cursor: pointer;
    border-radius: 8px;
    color: #475569;
    transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
    margin-bottom: 4px;
    position: relative;
    border: 1px solid transparent;
}

.node-item:hover {
    background: #eff6ff;
    border-color: #bfdbfe;
    color: #2563eb;
    transform: translateX(4px);
}

.node-meta {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-bottom: 2px;
}

.node-prefix {
    color: #3b82f6;
    font-weight: 800;
    font-size: 0.7rem;
    text-transform: uppercase;
}

.node-id { font-size: 0.7rem; color: #94a3b8; font-family: 'JetBrains Mono', monospace; font-weight: 600; }

.node-preview {
    font-size: 0.8rem;
    color: #64748b;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
}

.node-item:hover .node-preview {
    color: #3b82f6;
}

.empty-state { text-align: center; color: #cbd5e1; margin-top: 40px; font-weight: 600; font-size: 0.8rem; }
</style>
