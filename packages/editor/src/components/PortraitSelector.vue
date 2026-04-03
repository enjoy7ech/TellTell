<script setup lang="ts">
import { ref, nextTick, onUnmounted } from 'vue';
import { createPopper } from '@popperjs/core';

const props = defineProps<{
    modelValue: string;
    charId: string;
    portraitUrls: Map<string, string>;
    portraitHandles: Map<string, Map<string, any>>;
    placeholder?: string;
    disabled?: boolean;
}>();

const emit = defineEmits(['update:modelValue', 'visible-change']);

const activeKey = ref<string | null>(null);
const previewUrl = ref<string | null>(null);
const previewCardRef = ref<HTMLElement | null>(null);
let popperInstance: any = null;

async function onMouseEnter(pKey: string, e: MouseEvent) {
    activeKey.value = pKey;
    const targetEl = e.currentTarget as HTMLElement;
    
    const url = props.portraitUrls.get(`${props.charId}_${pKey}`);
    if (!url) return;

    previewUrl.value = url;

    await nextTick();
    if (previewCardRef.value && targetEl) {
        if (popperInstance) popperInstance.destroy();
        popperInstance = createPopper(targetEl, previewCardRef.value, {
            placement: 'right',
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
    <div class="portrait-selector">
        <el-select
            :model-value="modelValue"
            @update:model-value="(val: string) => emit('update:modelValue', val)"
            filterable
            :placeholder="placeholder || '选择表情...'"
            :disabled="disabled"
            @visible-change="(v: boolean) => emit('visible-change', v)"
            class="full-width"
        >
            <el-option label="-- 无立绘 --" value="" />
            <el-option
                v-for="p in Array.from(portraitHandles.get(charId)?.keys() || [])"
                :key="p"
                :label="p"
                :value="p"
            >
                <div 
                    class="portrait-opt-row"
                    @mouseenter="onMouseEnter(p, $event)"
                    @mouseleave="onMouseLeave"
                >
                    <span class="p-name">{{ p }}</span>
                    <div class="mini-hint" v-if="portraitUrls.get(`${charId}_${p}`)">
                        <img :src="portraitUrls.get(`${charId}_${p}`)" />
                    </div>
                </div>
            </el-option>
        </el-select>

        <!-- Floating Portrait Preview -->
        <Teleport to="body">
            <div ref="previewCardRef" class="portrait-float-card">
                <div class="portrait-inner" v-if="previewUrl">
                    <img :src="previewUrl" />
                    <div class="portrait-label">{{ activeKey }}</div>
                </div>
            </div>
        </Teleport>
    </div>
</template>

<style scoped>
.portrait-selector {
    width: 100%;
    display: contents; /* Passive wrapper for grid/flex */
}

.full-width {
    width: 100%;
}

.portrait-opt-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
    width: 100%;
    height: 100%;
}

.p-name {
    font-size: 0.85rem;
    font-weight: 600;
}

.mini-hint {
    width: 24px;
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

/* Float Card Styles */
.portrait-float-card {
    position: fixed;
    z-index: 10001; /* Above select dropdown */
    pointer-events: none;
    background: rgba(10, 10, 10, 0.9);
    backdrop-filter: blur(12px);
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: 12px;
    padding: 8px;
    box-shadow: 0 20px 50px rgba(0,0,0,0.8);
    display: none;
    opacity: 0;
    transition: opacity 0.2s cubic-bezier(0.4, 0, 0.2, 1);
}

.portrait-float-card[data-show] {
    display: block;
    opacity: 1;
}

.portrait-inner {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 8px;
}

.portrait-inner img {
    max-height: 400px;
    width: auto;
    object-fit: contain;
    filter: drop-shadow(0 10px 20px rgba(0,0,0,0.5));
}

.portrait-label {
    font-size: 0.75rem;
    font-weight: 900;
    color: var(--accent-color);
    text-transform: uppercase;
    letter-spacing: 2px;
    background: rgba(0,0,0,0.4);
    padding: 2px 12px;
    border-radius: 4px;
}
</style>
