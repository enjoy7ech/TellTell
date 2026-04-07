<script setup lang="ts">
import { ref, computed, inject } from 'vue';
import { Search, PriceTag, Files } from '@element-plus/icons-vue';

const state = inject<any>('state');
const allNodes = inject<any>('all-nodes');

defineEmits(['select-node']);

const filterText = ref('');
const selectedTags = ref<string[]>([]);

// Extract all unique tags from all nodes
const allTags = computed(() => {
    const tags = new Set<string>();
    allNodes.value.forEach((node: any) => {
        if (node.data?.tags) {
            node.data.tags.forEach((t: string) => tags.add(t));
        }
    });
    return Array.from(tags).sort();
});

const filteredNodes = computed(() => {
    if (!allNodes.value) return [];
    
    return allNodes.value.filter((node: any) => {
        // 1. Text filter
        const id = node.data?.id || node.id || '';
        const text = node.data?.display?.[0]?.dialog?.text || '';
        const matchesText = id.toLowerCase().includes(filterText.value.toLowerCase()) || 
                           text.toLowerCase().includes(filterText.value.toLowerCase());
        
        // 2. Tag filter
        const nodeTags = node.data?.tags || [];
        const matchesTags = selectedTags.value.length === 0 || 
                           selectedTags.value.every(t => nodeTags.includes(t));
                           
        return matchesText && matchesTags;
    });
});

function toggleTag(tag: string) {
    const idx = selectedTags.value.indexOf(tag);
    if (idx > -1) {
        selectedTags.value.splice(idx, 1);
    } else {
        selectedTags.value.push(tag);
    }
}
</script>

<template>
    <div class="story-tree-container">
        <header class="tree-header">
            <el-input 
                v-model="filterText" 
                placeholder="搜索剧情 ID 或 文本..." 
                :prefix-icon="Search"
                clearable
                size="small"
                class="search-bar"
            />
        </header>

        <!-- Tag Filter Area -->
        <div class="tag-filters" v-if="allTags.length > 0">
            <span class="tag-label">
                <el-icon><PriceTag /></el-icon> 标签筛选:
            </span>
            <div class="tag-cloud">
                 <el-tag 
                    v-for="tag in allTags" 
                    :key="tag" 
                    :type="selectedTags.includes(tag) ? 'primary' : 'info'"
                    effect="plain"
                    round
                    size="small"
                    class="clickable-tag"
                    @click="toggleTag(tag)"
                >
                    {{ tag }}
                </el-tag>
            </div>
        </div>

        <div class="tree-list">
             <div class="node-list no-indent">
                <div 
                    v-for="node in filteredNodes" 
                    :key="node.id" 
                    class="node-item"
                    :class="{ 'active': state?.node?.id === node.id }"
                    @click="$emit('select-node', node)"
                >
                    <div class="node-meta">
                        <span class="node-title-main">{{ node.data.id || node.id }}</span>
                        <div class="node-tags-inline" v-if="node.data.tags?.length">
                            <el-tag v-for="t in node.data.tags" :key="t" size="small" class="mini-tag">{{ t }}</el-tag>
                        </div>
                    </div>
                    <div class="node-frame-count">
                        <el-icon style="margin-right: 4px;"><Files /></el-icon>
                        {{ node.data.display?.length || 0 }} 个分镜
                    </div>
                </div>
            </div>
            
            <div v-if="filteredNodes.length === 0" class="empty-state">
                {{ allNodes?.value?.length > 0 ? '没有匹配的剧情节点' : '当前项目暂无剧情节点' }}
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

.tree-header { margin-bottom: 12px; }

.search-bar :deep(.el-input__wrapper) {
    background: #f8fafc;
    border-radius: 8px;
    box-shadow: none !important;
    border: 1px solid #e2e8f0;
}

.tag-filters {
    margin-bottom: 16px;
    display: flex;
    flex-direction: column;
    gap: 8px;
}

.tag-label {
    font-size: 0.65rem;
    font-weight: 800;
    color: #94a3b8;
    display: flex;
    align-items: center;
    gap: 4px;
    text-transform: uppercase;
}

.tag-cloud {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
}

.clickable-tag {
    cursor: pointer;
    transition: all 0.2s;
}

.clickable-tag:hover {
    transform: translateY(-1px);
    box-shadow: 0 2px 4px rgba(0,0,0,0.05);
}

.node-list.no-indent { padding-left: 0; border-left: none; }

.tree-list {
    flex: 1;
    overflow-y: auto;
}

.node-item {
    padding: 10px 14px;
    font-size: 0.85rem;
    cursor: pointer;
    border-radius: 10px;
    color: #475569;
    transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
    margin-bottom: 8px;
    position: relative;
    border: 1px solid #f1f5f9;
    background: #ffffff;
}

.node-item:hover {
    background: #eff6ff;
    border-color: #bfdbfe;
    color: #2563eb;
    box-shadow: 0 4px 12px rgba(59, 130, 246, 0.1);
}

.node-item.active {
    background: #3b82f6;
    border-color: #2563eb;
    box-shadow: 0 4px 12px rgba(59, 130, 246, 0.2);
}

.node-item.active .node-title-main,
.node-item.active .node-frame-count {
    color: #ffffff !important;
}

.node-item.active .mini-tag {
    background: rgba(255, 255, 255, 0.2);
    border-color: rgba(255, 255, 255, 0.4);
    color: white;
}

.node-meta {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-bottom: 4px;
    flex-wrap: wrap;
}

.node-title-main {
    color: #3b82f6; /* Changed from dark slate to vibrant blue */
    font-weight: 850;
    font-size: 0.85rem;
    letter-spacing: -0.2px;
}

.node-frame-count {
    font-size: 0.75rem;
    color: #94a3b8;
    display: flex;
    align-items: center;
    margin-top: 2px;
}

.node-item:hover .node-frame-count {
    color: #3b82f6;
    opacity: 0.8;
}

.node-tags-inline { display: flex; gap: 4px; margin-left: auto; }
.mini-tag { height: 16px; padding: 0 4px; font-size: 0.6rem; transform: scale(0.9); }

.empty-state { text-align: center; color: #cbd5e1; margin-top: 40px; font-weight: 600; font-size: 0.8rem; }
</style>
