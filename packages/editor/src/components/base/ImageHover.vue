<script setup lang="ts">
import { ref, onUnmounted, nextTick, watch } from 'vue';
import { createPopper } from '@popperjs/core';

const props = defineProps<{
    src: string | Promise<string>;
    title?: string;
    subTitle?: string;
    disabled?: boolean;
}>();

const resolvedSrc = ref('');
watch(() => props.src, async (newVal) => {
    if (newVal instanceof Promise) {
        resolvedSrc.value = await newVal;
    } else {
        resolvedSrc.value = newVal;
    }
}, { immediate: true });

const isVisible = ref(false);
const triggerRef = ref<HTMLElement | null>(null);
const popperRef = ref<HTMLElement | null>(null);
let popperInstance: any = null;

async function show() {
    if (props.disabled || !resolvedSrc.value) return;
    isVisible.value = true;
    await nextTick();
    if (triggerRef.value && popperRef.value) {
        if (popperInstance) popperInstance.destroy();
        popperInstance = createPopper(triggerRef.value, popperRef.value, {
            placement: 'right',
            modifiers: [
                { name: 'offset', options: { offset: [20, 0] } },
                { name: 'flip', options: { fallbackPlacements: ['left', 'top', 'bottom'] } },
                { name: 'preventOverflow', options: { padding: 10 } }
            ]
        });
        popperInstance.forceUpdate();
    }
}

function hide() {
    isVisible.value = false;
    if (popperInstance) {
        popperInstance.destroy();
        popperInstance = null;
    }
}

onUnmounted(() => {
    if (popperInstance) popperInstance.destroy();
});

</script>

<template>
    <div class="image-hover-wrapper"
        ref="triggerRef"
        @mouseenter="show"
        @mouseleave="hide">
        <slot></slot>

        <Teleport to="body">
            <div v-if="isVisible" ref="popperRef" class="image-preview-card">
                <div class="preview-portrait">
                    <img :src="resolvedSrc" alt="preview" />
                </div>
                <div v-if="title || subTitle" class="preview-info">
                    <div v-if="title" class="preview-name">{{ title }}</div>
                    <div v-if="subTitle" class="preview-id">{{ subTitle }}</div>
                </div>
            </div>
        </Teleport>
    </div>
</template>

<style scoped>
.image-hover-wrapper {
    display: inline-block;
    width: 100%;
}

.image-preview-card {
    position: absolute;
    background: #111;
    border: 1px solid #333;
    border-radius: 12px;
    padding: 0px;
    box-shadow: 0 10px 40px rgba(0,0,0,0.8);
    z-index: 3000;
    width: 180px;
    pointer-events: none;
    overflow: visible;
}

.preview-portrait {
    width: 100%;
    display: flex;
    justify-content: center;
    position: relative;
    padding: 10px 0;
}

.preview-portrait img {
    max-width: 90%;
    height: auto;
    filter: drop-shadow(0 10px 20px rgba(0,0,0,0.8));
    margin-top: -20px;
}

.preview-info {
    padding: 12px;
    background: rgba(0,0,0,0.1);
    border-radius: 0 0 12px 12px;
}

.preview-name {
    font-size: 0.9rem;
    font-weight: 800;
    color: #fff;
    text-transform: uppercase;
    letter-spacing: 1px;
}

.preview-id {
    font-size: 0.65rem;
    color: #555;
    font-family: monospace;
    margin-top: 2px;
}
</style>
