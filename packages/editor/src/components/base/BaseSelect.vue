<script setup lang="ts">
import { ref, onMounted, nextTick, onUnmounted, computed, watch } from 'vue';
import { createPopper } from '@popperjs/core';
import ImageHover from './ImageHover.vue';

interface Option {
    label: string;
    value: string | number;
}

const props = defineProps<{
    modelValue: string | number;
    options: Option[];
    placeholder?: string;
    disabled?: boolean;
    label?: string;
    optionPreview?: (value: string | number) => string | Promise<string>;
}>();

const emit = defineEmits(['update:modelValue', 'change']);

const isOpen = ref(false);
const triggerRef = ref<HTMLElement | null>(null);
const dropdownRef = ref<HTMLElement | null>(null);
let popperInstance: any = null;

const displayLabel = computed(() => {
    const opt = props.options.find(o => o.value === props.modelValue);
    return opt ? opt.label : props.placeholder || '请选择...';
});

function toggle() {
    if (props.disabled) return;
    isOpen.value = !isOpen.value;
    if (isOpen.value) {
        initPopper();
    }
}

async function initPopper() {
    await nextTick();
    if (triggerRef.value && dropdownRef.value) {
        if (popperInstance) popperInstance.destroy();
        popperInstance = createPopper(triggerRef.value, dropdownRef.value, {
            placement: 'bottom-start',
            modifiers: [
                { name: 'offset', options: { offset: [0, 6] } },
                { name: 'flip', options: { fallbackPlacements: ['top-start'] } },
                { name: 'preventOverflow', options: { padding: 10 } }
            ]
        });
        popperInstance.forceUpdate();
    }
}

function select(val: string | number) {
    emit('update:modelValue', val);
    emit('change', val);
    isOpen.value = false;
}

const optionUrls = ref<Map<string | number, string>>(new Map());
watch(() => props.options, async (newOpts) => {
    if (!props.optionPreview) return;
    for (const opt of newOpts) {
        const res = props.optionPreview(opt.value);
        if (typeof res === 'string') {
            optionUrls.value.set(opt.value, res);
        } else {
            optionUrls.value.set(opt.value, await res);
        }
    }
}, { immediate: true, deep: true });

function handleClickOutside(e: MouseEvent) {
    if (isOpen.value && triggerRef.value && !triggerRef.value.contains(e.target as Node) && !dropdownRef.value?.contains(e.target as Node)) {
        isOpen.value = false;
    }
}

onMounted(() => {
    window.addEventListener('click', handleClickOutside);
});

onUnmounted(() => {
    window.removeEventListener('click', handleClickOutside);
    if (popperInstance) popperInstance.destroy();
});
</script>

<template>
    <div class="base-select-container" :class="{ 'has-label': label, 'is-disabled': disabled }">
        <label v-if="label" class="base-label">{{ label }}</label>
        <div ref="triggerRef" class="select-trigger" @click="toggle" :class="{ 'is-open': isOpen }">
            <span class="trigger-text" :class="{ 'is-empty': !modelValue && modelValue !== 0 }">{{ displayLabel }}</span>
            <span class="arrow">▼</span>
        </div>

        <Teleport to="body">
            <div v-if="isOpen" ref="dropdownRef" class="select-dropdown">
                <div v-for="opt in options" :key="opt.value" 
                    class="select-option-wrapper">
                    <ImageHover 
                        :src="optionUrls.get(opt.value) || ''" 
                        :disabled="!optionPreview"
                        :title="opt.label">
                        <div 
                            class="select-option" 
                            :class="{ 'is-active': modelValue === opt.value }"
                            @click="select(opt.value)">
                            {{ opt.label }}
                        </div>
                    </ImageHover>
                </div>
            </div>
        </Teleport>
    </div>
</template>

<style scoped>
.base-select-container {
    width: 100%;
    display: flex;
    flex-direction: column;
    gap: 4px;
}

.base-label {
    font-size: 0.65rem;
    color: #666;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    font-weight: 600;
}

.select-trigger {
    background: #0a0a0a;
    border: 1px solid #222;
    border-radius: 8px;
    padding: 0 12px;
    min-height: 34px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    cursor: pointer;
    transition: all 0.2s;
    user-select: none;
}

.select-trigger:hover {
    border-color: #444;
}

.select-trigger.is-open {
    border-color: #3498db;
    box-shadow: 0 0 0 3px rgba(52, 152, 219, 0.15);
    background: #0f0f0f;
}

.trigger-text {
    font-size: 0.85rem;
    color: #eee;
}

.is-empty {
    color: #666;
}

.arrow {
    font-size: 0.6rem;
    opacity: 0.4;
    transition: transform 0.2s;
}

.is-open .arrow {
    transform: rotate(180deg);
}

.select-dropdown {
    background: #111;
    border: 1px solid #333;
    border-radius: 10px;
    box-shadow: 0 10px 40px rgba(0,0,0,0.6);
    z-index: 2100;
    max-height: 240px;
    overflow-y: auto;
    width: var(--select-width);
    min-width: 156px;
    animation: slideIn 0.15s ease-out;
}

@keyframes slideIn {
    from { opacity: 0; transform: translateY(-5px); }
    to { opacity: 1; transform: translateY(0); }
}

.select-option {
    padding: 10px 14px;
    font-size: 0.85rem;
    color: #aaa;
    cursor: pointer;
    transition: all 0.2s;
}

.select-option:hover {
    background: #1a1a1a;
    color: #fff;
    padding-left: 18px;
}

.select-option.is-active {
    color: #3498db;
    background: rgba(52, 152, 219, 0.08);
}

.is-disabled .select-trigger {
    opacity: 0.5;
    background: #111;
    cursor: not-allowed;
    border-color: #222;
}
</style>
