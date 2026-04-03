<script setup lang="ts">
import { ref, nextTick, onUnmounted } from 'vue';
import { createPopper } from '@popperjs/core';

const props = withDefaults(defineProps<{
    modelValue: string;
    charId: string;
    portraitUrls: Map<string, string>;
    portraitHandles: Map<string, Map<string, any>>;
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

async function onMouseEnter(pKey: string, e: MouseEvent) {
    activeKey.value = pKey;
    const targetEl = e.currentTarget as HTMLElement;
    
    const url = props.portraitUrls.get(`${props.charId}/${pKey}`);
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
            clearable
            @visible-change="(v: boolean) => emit('visible-change', v)"
            class="full-width"
            :size="size"
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
                    <div class="mini-hint" v-if="portraitUrls.get(`${charId}/${p}`)">
                        <img :src="portraitUrls.get(`${charId}/${p}`)" />
                    </div>
                </div>
            </el-option>
        </el-select>

        <!-- Floating Portrait Preview (White Style) -->
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
    color: #475569;
}

.p-name {
    font-size: 0.85rem;
    font-weight: 600;
}

.mini-hint {
    width: 28px;
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
.portrait-float-card {
    position: fixed;
    z-index: 10001;
    pointer-events: none;
    background: #ffffff;
    border: 1px solid #e2e8f0;
    border-radius: 12px;
    padding: 10px;
    box-shadow: 0 20px 60px rgba(0,0,0,0.12), 0 4px 10px rgba(0,0,0,0.02);
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
    gap: 12px;
}

.portrait-inner img {
    max-height: 440px;
    width: auto;
    object-fit: contain;
    border-radius: 4px;
}

.portrait-label {
    font-size: 0.7rem;
    font-weight: 800;
    color: #3b82f6;
    text-transform: uppercase;
    letter-spacing: 1.5px;
    background: #eff6ff;
    padding: 4px 14px;
    border-radius: 20px;
    border: 1px solid #bfdbfe;
}
</style>
