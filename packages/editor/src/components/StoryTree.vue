<script setup lang="ts">
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
            <button class="btn-micro" @click="$emit('add-folder')">
                <span class="plus">+</span> 新章节
            </button>
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
    font-size: 0.75rem;
    font-weight: 800;
    color: #666;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    margin-bottom: 12px;
}

.btn-micro {
    background: #2980b9;
    color: white;
    border: none;
    border-radius: 4px;
    padding: 2px 8px;
    font-size: 0.7rem;
    cursor: pointer;
    font-weight: bold;
    display: flex;
    align-items: center;
}

.btn-micro:hover { filter: brightness(1.1); }
.plus { margin-right: 4px; font-weight: 900; }

.tree-list {
    flex: 1;
    overflow-y: auto;
}

.folder-group {
    margin-bottom: 20px;
}

.folder-header {
    background: rgba(44, 62, 80, 0.4);
    padding: 10px 14px;
    border-radius: 8px;
    font-size: 0.85rem;
    font-weight: 700;
    color: #eee;
    margin-bottom: 8px;
    display: flex;
    align-items: center;
    gap: 10px;
}

.folder-icon { font-size: 1.1rem; }
.folder-name { flex: 1; }
.badge { font-size: 0.7rem; color: #888; }

.node-list {
    padding-left: 20px;
    border-left: 1px solid rgba(255,255,255,0.1);
}

.node-item {
    padding: 8px 12px;
    font-size: 0.85rem;
    cursor: pointer;
    border-radius: 6px;
    color: #888;
    transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
    margin-bottom: 4px;
    position: relative;
    overflow: hidden;
}

.node-item:hover {
    background: rgba(52, 152, 219, 0.1);
    color: #fff;
    transform: translateX(4px);
}

.node-meta {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-bottom: 2px;
}

.node-prefix {
    color: #3498db;
    font-weight: 800;
    font-size: 0.7rem;
    text-transform: uppercase;
}

.node-id { font-size: 0.7rem; opacity: 0.5; font-family: 'JetBrains Mono', monospace; }

.node-preview {
    font-size: 0.75rem;
    opacity: 0.6;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    font-style: italic;
}

.empty-state { text-align: center; color: #555; margin-top: 40px; font-style: italic; }
</style>
