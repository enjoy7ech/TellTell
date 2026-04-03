<script setup lang="ts">
import { CircleCheck, Box, CaretRight } from '@element-plus/icons-vue';

defineProps<{
    statusText: string;
}>();

defineEmits(['save', 'publish', 'play']);
</script>

<template>
    <header class="toolbar">
        <div class="toolbar-brand">TellTell <span class="workspace-label">WORKSPACE</span></div>
        
        <div class="toolbar-actions">
            <el-button type="info" plain @click="$emit('save')" :icon="CircleCheck" class="glass-btn">
                保存剧情 (Ctrl+S)
            </el-button>
            <el-button type="warning" plain @click="$emit('publish')" :icon="Box" class="glass-btn">
                发布发布剧情 Bundle
            </el-button>
        </div>

        <div class="flex-spacer"></div>

        <div class="toolbar-right">
            <div class="status-indicator">
                <div class="pulse"></div>
                <span class="status-text">{{ statusText }}</span>
            </div>
            <el-button type="primary" @click="$emit('play')" :icon="CaretRight" class="play-btn">
                运行预览
            </el-button>
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
    font-weight: 900;
    font-size: 1.2rem;
    color: #fff;
    letter-spacing: -1px;
    display: flex;
    align-items: center;
    gap: 8px;
}

.workspace-label {
    font-weight: 800;
    font-size: 0.65rem;
    background: var(--accent-color);
    color: #fff;
    padding: 2px 6px;
    border-radius: 4px;
    letter-spacing: 1px;
}

.toolbar-actions {
    display: flex;
    gap: 8px;
}

.flex-spacer { flex: 1; }

.glass-btn {
    background: rgba(255, 255, 255, 0.03) !important;
    border-color: rgba(255, 255, 255, 0.1) !important;
    backdrop-filter: blur(10px);
    font-weight: 700 !important;
    font-size: 0.8rem !important;
}

.glass-btn:hover {
    background: rgba(255, 255, 255, 0.08) !important;
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
    background: rgba(0,0,0,0.5);
    padding: 6px 14px;
    border-radius: 20px;
    border: 1px solid var(--border-color);
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

@keyframes pulse-kf {
    0% { transform: scale(0.9); opacity: 0.5; }
    50% { transform: scale(1.1); opacity: 1; }
    100% { transform: scale(0.9); opacity: 0.5; }
}
</style>

