<script setup lang="ts">
import { Handle, Position } from '@vue-flow/core';
import { VideoPlay } from '@element-plus/icons-vue';
import { computed } from 'vue';

const props = defineProps<{
    data: any;
    selected?: boolean;
}>();

const emit = defineEmits(['open-popover', 'play-node']);

const frames = computed(() => props.data.display || []);

function handlePlay(e: MouseEvent) {
    e.stopPropagation();
    emit('play-node', props.data.id || props.data.label);
}
</script>

<template>
    <div class="logic-node-v11" :class="{ selected }">
        <Handle type="target" :position="Position.Left" class="node-input-handle" />
        
        <div class="node-body">
            <div class="node-header">
                <div class="node-id-chip">{{ data.id }}</div>
                <el-tooltip content="从该节点开始预览 (PLAY)" placement="top">
                    <div class="play-btn-overlay" @click="handlePlay">
                        <el-icon><VideoPlay /></el-icon>
                    </div>
                </el-tooltip>
            </div>
            
            <!-- Frame Track with Label -->
            <div class="frame-track-wrapper" v-if="frames.length > 0">
                <div class="track-header">
                    <span class="track-label">分镜轨道 (FRAMES)</span>
                </div>
                <div class="frame-track">
                    <div 
                        v-for="(frame, idx) in frames" 
                        :key="idx" 
                        class="frame-square"
                        @click="(e) => $emit('open-popover', { index: idx, event: e })"
                    >
                        <!-- Only choice dots inside squares -->
                        <div class="dots-container" v-if="frame.choice && frame.choice.length > 0">
                            <div class="choice-dots">
                                <div v-for="n in frame.choice.length" :key="n" class="mini-choice-dot"></div>
                            </div>
                        </div>
                        <div class="tooltip-idx">{{ Number(idx) + 1 }}</div>
                    </div>
                </div>
            </div>

            <div v-if="frames.length === 0" class="empty-frames-hint">EMPTY NODE</div>
        </div>

        <Handle type="source" :position="Position.Right" class="node-output-handle" />
    </div>
</template>

<style scoped>
.logic-node-v11 {
    min-width: 150px;
    background: #ffffff;
    border-radius: 14px;
    padding: 12px;
    display: flex;
    flex-direction: column;
    gap: 8px;
    border: 1px solid #e2e8f0;
    position: relative;
    box-shadow: 0 1px 3px rgba(0,0,0,0.02);
    transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
}

.logic-node-v11:hover {
    border-color: #cbd5e1;
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(0,0,0,0.04);
}

.logic-node-v11.selected {
    border-color: #3b82f6;
    border-width: 2px;
}

.node-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 6px;
    position: relative;
    padding-right: 4px;
}

.node-id-chip {
    background: #f8fafc;
    padding: 2px 10px;
    border-radius: 6px;
    font-size: 11px;
    font-weight: 800;
    color: #475569;
    text-align: center;
    border: 1px solid #f1f5f9;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    flex: 1;
    margin-right: 8px;
    overflow: hidden;
    text-overflow: ellipsis;
}

.play-btn-overlay {
    width: 24px;
    height: 24px;
    border-radius: 6px;
    background: #eff6ff;
    color: #3b82f6;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    transition: all 0.2s;
    border: 1px solid #dbeafe;
}

.play-btn-overlay:hover {
    background: #3b82f6;
    color: #ffffff;
    transform: scale(1.1);
    box-shadow: 0 4px 6px -1px rgba(59, 130, 246, 0.2);
}

.frame-track-wrapper {
    background: #f1f5f9;
    border-radius: 12px;
    padding: 10px;
    border: 1px solid #e2e8f0;
}

.track-header {
    margin-bottom: 8px;
    display: flex;
    justify-content: flex-start;
}

.track-label {
    font-size: 0.55rem;
    font-weight: 900;
    color: #94a3b8;
    text-transform: uppercase;
    letter-spacing: 1.2px;
}

.frame-track {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
}

.frame-square {
    width: 22px;
    height: 22px;
    background: #ffffff;
    border: 1px solid #e2e8f0;
    border-radius: 6px;
    cursor: pointer;
    position: relative;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all 0.2s;
}

.frame-square:hover {
    border-color: #3b82f6;
    background: #eff6ff;
    transform: scale(1.1);
}

.dots-container {
    display: flex;
    align-items: center;
    justify-content: center;
}

.choice-dots {
    display: flex;
    gap: 1.5px;
    flex-wrap: wrap;
    align-items: center;
    justify-content: center;
}

.mini-choice-dot {
    width: 4px;
    height: 4px;
    background: #ec4899;
    border-radius: 50%;
}

.tooltip-idx {
    position: absolute;
    top: -22px;
    left: 50%;
    transform: translateX(-50%);
    background: #1e293b;
    color: white;
    font-size: 8px;
    padding: 2px 6px;
    border-radius: 4px;
    opacity: 0;
    pointer-events: none;
    transition: opacity 0.2s;
}

.frame-square:hover .tooltip-idx {
    opacity: 1;
}

.empty-frames-hint {
    font-size: 8px;
    font-weight: 900;
    color: #cbd5e1;
    text-align: center;
    padding: 6px;
}

/* Logic Handles */
.node-input-handle {
    width: 8px !important;
    height: 22px !important;
    border-radius: 5px 0 0 5px !important;
    background: #3b82f6 !important;
    border: none !important;
    left: -8px !important;
}

.node-output-handle {
    width: 8px !important;
    height: 22px !important;
    border-radius: 0 5px 5px 0 !important;
    background: #ec4899 !important;
    border: none !important;
    right: -8px !important;
}
</style>
