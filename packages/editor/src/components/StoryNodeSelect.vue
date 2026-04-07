<script setup lang="ts">
import { inject } from 'vue';

const props = defineProps<{
    modelValue: string;
    allNodeIds?: string[];
    placeholder?: string;
}>();

const allNodes = inject<any>('all-nodes');

const emit = defineEmits(['update:modelValue']);

function handleChange(val: string) {
    emit('update:modelValue', val);
}

function getFirstFrameText(nodeId: string) {
    if (!allNodes.value || allNodes.value.length === 0) {
        return '--- (无节点预览数据) ---';
    }
    const node = allNodes.value.find((n: any) => {
        const id = (n.data?.id || n.id || "").toString().trim();
        return id === nodeId.toString().trim();
    });
    
    if (!node) return '正在加载节点预览...';
    
    const display = node.data?.display || [];
    if (display.length === 0) return '该节点未配置分镜内容';
    
    const firstFrame = display[0];
    const text = (firstFrame.dialog?.text || "").trim() || (firstFrame.screen?.text || "").trim();
    return text || '(此分镜无对白内容)';
}
</script>

<template>
    <el-select 
        :model-value="modelValue" 
        @change="handleChange" 
        filterable 
        style="width: 100%;"
        :placeholder="placeholder || '选择剧情节点...'"
    >
        <el-option label="-- 无剧情跳转 --" value="" />
        <el-option v-for="id in allNodeIds" :key="id" :label="id" :value="id">
            <el-popover
                placement="right"
                :width="260"
                trigger="hover"
                popper-class="story-node-preview-popover"
                :teleported="true"
            >
                <template #reference>
                    <div class="option-row">
                        <span class="node-id">{{ id }}</span>
                    </div>
                </template>
                <div class="preview-box">
                    <div class="preview-tag">Story Preview</div>
                    <div class="preview-main-text">{{ getFirstFrameText(id) }}</div>
                </div>
            </el-popover>
        </el-option>
    </el-select>
</template>

<style>
/* Global styles for popper content since it is detached from component scope */
.story-node-preview-popover {
    padding: 12px !important;
    border-radius: 8px !important;
    border: 1px solid #e2e8f0 !important;
    box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1) !important;
    background: #ffffff !important;
}

.preview-box {
    display: flex;
    flex-direction: column;
    gap: 8px;
}

.preview-tag {
    font-size: 9px;
    font-weight: 800;
    color: #3b82f6;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    border-bottom: 1px solid #f1f5f9;
    padding-bottom: 4px;
}

.preview-main-text {
    font-size: 13px;
    line-height: 1.6;
    color: #1e293b;
    font-weight: 500;
    word-break: break-all;
    white-space: pre-wrap;
}

.node-id {
    display: block;
    overflow: hidden;
    text-overflow: ellipsis;
}
</style>

<style scoped>
:deep(.el-select__wrapper) {
    background-color: var(--bg-hover) !important;
}
</style>
