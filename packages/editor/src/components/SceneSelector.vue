<script setup lang="ts">
import { ref, nextTick, onUnmounted } from 'vue';
import { createPopper } from '@popperjs/core';

const props = defineProps<{
    modelValue: string;
    sceneUrls: Map<string, string>;
    sceneHandles: Map<string, any>;
    placeholder?: string;
    disabled?: boolean;
}>();

const emit = defineEmits(['update:modelValue', 'visible-change']);

const activeKey = ref<string | null>(null);
const previewUrl = ref<string | null>(null);
const previewCardRef = ref<HTMLElement | null>(null);
let popperInstance: any = null;

async function onMouseEnter(sceneId: string, e: MouseEvent) {
    activeKey.value = sceneId;
    const targetEl = e.currentTarget as HTMLElement;
    
    const url = props.sceneUrls.get(sceneId);
    if (!url) return;

    previewUrl.value = url;

    await nextTick();
    if (previewCardRef.value && targetEl) {
        if (popperInstance) popperInstance.destroy();
        popperInstance = createPopper(targetEl, previewCardRef.value, {
            placement: 'left',
            modifiers: [
                { name: 'offset', options: { offset: [0, 20] } },
                { name: 'preventOverflow', options: { boundary: 'viewport', padding: 10 } }
            ]
        });

        previewCardRef.value.setAttribute('data-show', '');
        popperInstance.forceUpdate();
    }
}

function onMouseLeave() {
    activeKey.value = null;
    previewUrl.value = null;
    if (popperInstance) {
        if (previewCardRef.value) {
            previewCardRef.value.removeAttribute('data-show');
        }
        popperInstance.destroy();
        popperInstance = null;
    }
}

onUnmounted(() => {
    if (popperInstance) popperInstance.destroy();
});
</script>

<template>
    <div class="scene-selector-wrapper">
        <el-select
            :model-value="modelValue"
            @update:model-value="(val: string) => emit('update:modelValue', val)"
            filterable
            :placeholder="placeholder || '选择背景图...'"
            :disabled="disabled"
            @visible-change="(v: boolean) => emit('visible-change', v)"
            class="full-width"
        >
            <el-option label="-- 无背景 --" value="" />
            <el-option
                v-for="sId in Array.from(sceneHandles.keys())"
                :key="sId"
                :label="sId"
                :value="sId"
            >
                <div 
                    class="scene-opt-row"
                    @mouseenter="onMouseEnter(sId, $event)"
                    @mouseleave="onMouseLeave"
                >
                    <span class="s-name">{{ sId }}</span>
                    <div class="mini-hint" v-if="sceneUrls.get(sId)">
                        <img :src="sceneUrls.get(sId)" />
                    </div>
                </div>
            </el-option>
        </el-select>

        <!-- Floating Scene Preview -->
        <Teleport to="body">
            <div ref="previewCardRef" class="scene-float-card">
                <div class="scene-inner" v-if="previewUrl">
                    <img :src="previewUrl" />
                    <div class="scene-label">{{ activeKey }}</div>
                </div>
            </div>
        </Teleport>
    </div>
</template>

<style scoped>
.scene-selector-wrapper {
    width: 100%;
}

.full-width {
    width: 100%;
}

.scene-opt-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
    width: 100%;
    height: 100%;
}

.s-name {
    font-size: 0.85rem;
    font-weight: 600;
}

.mini-hint {
    width: 40px;
    height: 24px;
    border-radius: 4px;
    overflow: hidden;
    background: #000;
}

.mini-hint img {
    width: 100%;
    height: 100%;
    object-fit: cover;
    opacity: 0.6;
}

.scene-float-card {
    position: fixed;
    z-index: 10001;
    pointer-events: none;
    background: rgba(10, 10, 10, 0.9);
    backdrop-filter: blur(12px);
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: 12px;
    padding: 10px;
    box-shadow: 0 20px 50px rgba(0,0,0,0.8);
    display: none;
    opacity: 0;
    transition: opacity 0.2s;
}

.scene-float-card[data-show] {
    display: block;
    opacity: 1;
}

.scene-inner {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 8px;
}

.scene-inner img {
    max-width: 400px;
    border-radius: 8px;
    box-shadow: 0 10px 30px rgba(0,0,0,0.5);
}

.scene-label {
    font-size: 0.75rem;
    font-weight: 900;
    color: var(--accent-color);
    text-transform: uppercase;
    letter-spacing: 2px;
}
</style>
