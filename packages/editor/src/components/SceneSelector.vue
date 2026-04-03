<script setup lang="ts">
import { ref, nextTick, onUnmounted } from 'vue';
import { createPopper } from '@popperjs/core';

const props = withDefaults(defineProps<{
    modelValue: string;
    sceneUrls: Map<string, string>;
    sceneHandles: Map<string, any>;
    placeholder?: string;
    disabled?: boolean;
    size?: any;
}>(), {
    size: 'small'
});

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
            clearable
            class="full-width"
            :size="size"
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

        <!-- Floating Scene Preview (White Style Restoration) -->
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
    color: #475569;
}

.s-name {
    font-size: 0.85rem;
    font-weight: 600;
}

.mini-hint {
    width: 48px;
    height: 28px;
    border-radius: 4px;
    overflow: hidden;
    background: #f1f5f9;
    border: 1px solid #e2e8f0;
}

.mini-hint img {
    width: 100%;
    height: 100%;
    object-fit: cover;
}

/* Float Card Styles (White Mode) */
.scene-float-card {
    position: fixed;
    z-index: 10001;
    pointer-events: none;
    background: #ffffff;
    border: 1px solid #e2e8f0;
    border-radius: 12px;
    padding: 12px;
    box-shadow: 0 20px 50px rgba(0,0,0,0.1);
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
    gap: 12px;
}

.scene-inner img {
    max-width: 440px;
    border-radius: 8px;
    box-shadow: 0 8px 24px rgba(0,0,0,0.08);
    border: 1px solid #f1f5f9;
}

.scene-label {
    font-size: 0.7rem;
    font-weight: 900;
    color: #3b82f6;
    text-transform: uppercase;
    letter-spacing: 1.5px;
    background: #eff6ff;
    padding: 4px 14px;
    border-radius: 20px;
    border: 1px solid #bfdbfe;
}
</style>
