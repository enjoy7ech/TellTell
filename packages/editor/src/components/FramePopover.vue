<script setup lang="ts">
import { ref, onUnmounted, computed } from 'vue';
import FrameEditor from './FrameEditor.vue';
import { Close, ArrowDown } from '@element-plus/icons-vue';

const props = defineProps<{
    node: any;
    index: number;
    x: number;
    y: number;
    characterIds: string[];
    characterProfiles: Map<string, any>;
    portraitHandles: Map<string, Map<string, any>>;
    portraitUrls: Map<string, string>;
    sceneHandles: Map<string, any>;
    sceneUrls: Map<string, string>;
    nodeIds: string[];
    getImageUrl: (handle: any) => Promise<string>;
    preloadPortraits: (charId: string) => void;
}>();

const emit = defineEmits(['close', 'change']);

const frame = computed(() => props.node?.data?.display[props.index]);

// Drag Logic
const localX = ref(props.x);
const localY = ref(props.y);
const isDragging = ref(false);
const startX = ref(0);
const startY = ref(0);

function onMouseDown(e: MouseEvent) {
    // Only drag from header
    const target = e.target as HTMLElement;
    if (target.closest('.close-btn')) return;
    
    isDragging.value = true;
    startX.value = e.clientX - localX.value;
    startY.value = e.clientY - localY.value;
    
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
}

function onMouseMove(e: MouseEvent) {
    if (!isDragging.value) return;
    localX.value = e.clientX - startX.value;
    localY.value = e.clientY - startY.value;
}

function onMouseUp() {
    isDragging.value = false;
    window.removeEventListener('mousemove', onMouseMove);
    window.removeEventListener('mouseup', onMouseUp);
}

function handleClose() {
    emit('close');
}

function handleDataChange() {
    emit('change');
}

onUnmounted(() => {
    window.removeEventListener('mousemove', onMouseMove);
    window.removeEventListener('mouseup', onMouseUp);
});
</script>

<template>
    <div v-if="frame" 
        class="frame-popover" 
        :style="{ left: localX + 'px', top: localY + 'px' }"
        :class="{ dragging: isDragging }"
    >
        <div class="popover-header" @mousedown="onMouseDown">
            <div class="header-left">
                <el-icon class="expand-icon"><ArrowDown /></el-icon>
                <span class="frame-title">配置分镜 #{{ index + 1 }}</span>
                <span class="drag-hint">(可拖拽)</span>
            </div>
            <el-button class="close-btn" circle :icon="Close" @click="handleClose" />
        </div>

        <div class="popover-body">
            <FrameEditor 
                v-model="frame"
                :character-ids="characterIds"
                :character-profiles="characterProfiles"
                :portrait-handles="portraitHandles"
                :portrait-urls="portraitUrls"
                :scene-handles="sceneHandles"
                :scene-urls="sceneUrls"
                :node-ids="nodeIds"
                :get-image-url="getImageUrl"
                :preload-portraits="preloadPortraits"
                @change="handleDataChange"
            />
        </div>
    </div>
</template>

<style scoped>
.frame-popover {
    position: fixed;
    z-index: 5;
    width: 480px;
    background: #ffffff;
    border: 1px solid #e2e8f0;
    border-radius: 16px;
    box-shadow: 0 25px 60px rgba(0,0,0,0.15), 0 5px 15px rgba(0,0,0,0.05);
    overflow: hidden;
    animation: popIn 0.2s cubic-bezier(0.18, 0.89, 0.32, 1.28);
    display: flex;
    flex-direction: column;
}

.frame-popover.dragging {
    transition: none;
    opacity: 0.9;
    cursor: grabbing;
}

@keyframes popIn {
    from { opacity: 0; transform: scale(0.95) translateY(10px); }
    to { opacity: 1; transform: scale(1) translateY(0); }
}

.popover-header {
    background: #f8fafc;
    padding: 16px 20px;
    display: flex;
    justify-content: space-between;
    align-items: center;
    border-bottom: 1px solid #e2e8f0;
    cursor: grab;
    user-select: none;
}

.header-left {
    display: flex;
    align-items: center;
    gap: 12px;
}

.expand-icon {
    color: #3b82f6;
    font-size: 1.1rem;
}

.frame-title {
    font-weight: 800;
    font-size: 0.95rem;
    color: #1e293b;
    text-transform: uppercase;
    letter-spacing: 0.5px;
}

.drag-hint {
    font-size: 0.65rem;
    color: #94a3b8;
    font-weight: 700;
    background: #f1f5f9;
    padding: 2px 8px;
    border-radius: 4px;
}

.close-btn {
    background: #f1f5f9 !important;
    border: none !important;
    color: #64748b;
}

.popover-body {
    padding: 24px;
    max-height: 70vh;
    overflow-y: auto;
}

:deep(.el-divider) {
    border-top-color: #e2e8f0 !important;
}

::-webkit-scrollbar {
    width: 6px;
}
::-webkit-scrollbar-thumb {
    background: #cbd5e1;
    border-radius: 10px;
}
</style>
