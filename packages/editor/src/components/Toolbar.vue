<script setup lang="ts">
import { Box, CaretRight, Plus } from '@element-plus/icons-vue';

defineProps<{
    statusText: string;
    directoryName: string;
}>();

defineEmits(['save', 'publish', 'play', 'add-node']);
</script>

<template>
    <header class="toolbar">
        
        <div class="toolbar-actions">
            <el-button type="info" plain @click="$emit('add-node')" :icon="Plus" class="glass-btn">
                新建剧情节点
            </el-button>
            <el-button type="warning" plain @click="$emit('publish')" :icon="Box" class="glass-btn">
                同步 Bundle
            </el-button>
        </div>

        <div class="flex-spacer"></div>

        <div class="toolbar-right">
            <div class="status-indicator clickable" :class="{ 'error-state': statusText.includes('失败') }" @click="$emit('save')">
                <div class="pulse"></div>
                <span class="status-text">{{ statusText }}</span>
            </div>
        </div>
    </header>
</template>

<style scoped>
.toolbar {
    height: 64px;
    background: var(--sidebar-bg);
    border-bottom: 1px solid var(--border-color);
    display: flex;
    align-items: center;
    padding: 0 24px;
    gap: 20px;
    box-shadow: var(--shadow-sm);
    z-index: 5;
    position: relative;
}

.toolbar-brand {
    font-weight: 800;
    font-size: 1.1rem;
    color: #0f172a;
    letter-spacing: -0.5px;
    display: flex;
    align-items: center;
    gap: 8px;
}

.project-tag {
    font-weight: 900;
    font-size: 0.65rem;
    color: var(--accent-color);
    letter-spacing: 1px;
    margin-right: 4px;
}

.toolbar-actions {
    display: flex;
    gap: 8px;
}

.flex-spacer { flex: 1; }

.glass-btn {
    background: #ffffff !important;
    border-color: #e2e8f0 !important;
    color: #475569 !important;
    font-weight: 700 !important;
    font-size: 0.8rem !important;
}

.glass-btn:hover {
    background: #f8fafc !important;
    border-color: var(--accent-color) !important;
}

.play-btn {
    font-weight: 900 !important;
    box-shadow: 0 4px 15px var(--accent-glow);
    padding: 0 24px !important;
}

.toolbar-right {
    display: flex;
    align-items: center;
    gap: 24px;
}

.status-indicator {
    display: flex;
    align-items: center;
    gap: 8px;
    background: #f1f5f9;
    padding: 6px 14px;
    border-radius: 20px;
    border: 1px solid var(--border-color);
    transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
}

.status-indicator.clickable {
    cursor: pointer;
}

.status-indicator.clickable:hover {
    background: rgba(255,255,255,0.08);
    border-color: rgba(52, 152, 219, 0.5);
}

.status-indicator.clickable:active {
    transform: scale(0.96);
    background: rgba(52, 152, 219, 0.2);
}

.status-text {
    font-size: 0.7rem;
    color: var(--text-dim);
    font-weight: 800;
    text-transform: uppercase;
    letter-spacing: 0.5px;
}

.pulse {
    width: 6px;
    height: 6px;
    background: #27ae60;
    border-radius: 50%;
    box-shadow: 0 0 8px #27ae60;
    animation: pulse-kf 2s infinite;
}

.status-indicator.error-state {
    border-color: rgba(245, 108, 108, 0.4);
    background: rgba(245, 108, 108, 0.1);
}

.status-indicator.error-state .status-text {
    color: #f56c6c;
}

.status-indicator.error-state .pulse {
    background: #f56c6c;
    box-shadow: 0 0 8px #f56c6c;
}

@keyframes pulse-kf {
    0% { transform: scale(0.9); opacity: 0.5; }
    50% { transform: scale(1.1); opacity: 1; }
    100% { transform: scale(0.9); opacity: 0.5; }
}
</style>

