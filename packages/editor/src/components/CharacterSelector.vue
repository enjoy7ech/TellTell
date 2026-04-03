<script setup lang="ts">
import { ref, nextTick, onUnmounted } from 'vue';
import { createPopper } from '@popperjs/core';

const props = defineProps<{
    modelValue: string;
    characterIds: string[];
    characterProfiles: Map<string, any>;
    portraitHandles: Map<string, Map<string, any>>;
    getImageUrl: (handle: any) => Promise<string>;
    placeholder?: string;
    disabled?: boolean;
}>();

const emit = defineEmits(['update:modelValue', 'change']);

const activeId = ref<string | null>(null);
const previewData = ref<any>(null);
const previewCardRef = ref<HTMLElement | null>(null);
let popperInstance: any = null;

async function onMouseEnter(id: string, e: MouseEvent) {
    activeId.value = id;
    const targetEl = e.currentTarget as HTMLElement;
    
    // Fetch profile and portrait data
    const profile = props.characterProfiles.get(id);
    const pMap = props.portraitHandles.get(id);
    
    let targetPortraitKey = null;
    if (pMap) {
        targetPortraitKey = pMap.has('normal') ? 'normal' : Array.from(pMap.keys())[0];
    }
    
    const portraitUrl = (targetPortraitKey && pMap) ? await props.getImageUrl(pMap.get(targetPortraitKey)) : '';
    
    // Check if we already moved away
    if (activeId.value !== id) return;

    previewData.value = {
        id,
        name: profile?.name || id,
        age: profile?.age || '?',
        height: profile?.height || '?',
        weight: profile?.weight || '?',
        blood: profile?.bloodType || '?',
        isProtagonist: profile?.isProtagonist,
        portrait: portraitUrl
    };

    await nextTick();
    if (previewCardRef.value && targetEl) {
        if (popperInstance) popperInstance.destroy();
        popperInstance = createPopper(targetEl, previewCardRef.value, {
            placement: 'right-start',
            modifiers: [
                { name: 'offset', options: { offset: [0, 16] } },
                { name: 'preventOverflow', options: { boundary: 'viewport', padding: 10 } },
                { name: 'flip', options: { fallbackPlacements: ['left-start', 'bottom'] } }
            ]
        });

        previewCardRef.value.setAttribute('data-show', '');
        popperInstance.forceUpdate();
    }
}

function onMouseLeave() {
    activeId.value = null;
    previewData.value = null;
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

function onChange(val: string) {
    emit('update:modelValue', val);
    emit('change', val);
}
</script>

<template>
    <div class="character-selector">
        <el-select
            :model-value="modelValue"
            @update:model-value="onChange"
            :placeholder="placeholder || '选择角色...'"
            :disabled="disabled"
            filterable
            class="full-width"
            popper-class="character-select-dropdown"
        >
            <el-option
                v-for="id in characterIds"
                :key="id"
                :label="characterProfiles.get(id)?.name || id"
                :value="id"
            >
                <div 
                    class="selector-item-content"
                    @mouseenter="onMouseEnter(id, $event)"
                    @mouseleave="onMouseLeave"
                >
                    <span class="item-id">{{ id }}</span>
                    <span v-if="characterProfiles.get(id)?.name" class="item-name">{{ characterProfiles.get(id).name }}</span>
                </div>
            </el-option>
        </el-select>

        <!-- Purified Float Preview Card -->
        <Teleport to="body">
            <div ref="previewCardRef" class="char-mini-card">
                <div class="card-inner" v-if="previewData">
                    <div class="card-background-glow"></div>
                    <div class="card-portrait" v-if="previewData.portrait">
                        <img :src="previewData.portrait" />
                    </div>
                    <div class="card-main">
                        <div class="card-title">
                            <span class="name">{{ previewData.name }}</span>
                            <span v-if="previewData.isProtagonist" class="protagonist-badge">PROTAGONIST</span>
                        </div>
                        <div class="card-id">UID: {{ previewData.id }}</div>
                        <div class="card-stats">
                            <div class="stat-item"><span class="label">AGE</span><span class="val">{{ previewData.age }}</span></div>
                            <div class="stat-item"><span class="label">HGT</span><span class="val">{{ previewData.height }}</span></div>
                            <div class="stat-item"><span class="label">WGT</span><span class="val">{{ previewData.weight }}</span></div>
                            <div class="stat-item"><span class="label">BLD</span><span class="val">{{ previewData.blood }}</span></div>
                        </div>
                    </div>
                </div>
            </div>
        </Teleport>
    </div>
</template>

<style scoped>
.character-selector {
    display: contents;
}

.full-width {
    width: 100%;
}

.selector-item-content {
    display: flex;
    justify-content: space-between;
    align-items: center;
    width: 100%;
    height: 100%;
}

.item-id {
    font-weight: 700;
    font-size: 0.85rem;
}

.item-name {
    font-size: 0.7rem;
    color: var(--text-dim);
    font-weight: 500;
}

/* Float Preview Card - Purified Premium Style */
.char-mini-card {
    position: fixed;
    z-index: 10000;
    pointer-events: none;
    background: rgba(18, 18, 18, 0.95);
    backdrop-filter: blur(12px);
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: var(--radius-lg);
    padding: 16px;
    box-shadow: var(--shadow-lg);
    min-width: 240px;
    
    display: none;
    opacity: 0;
    transition: opacity 0.2s cubic-bezier(0.4, 0, 0.2, 1);
    overflow: visible;
}

.char-mini-card[data-show] {
    display: block;
    opacity: 1;
}

.card-inner {
    display: flex;
    gap: 16px;
    align-items: flex-start;
    position: relative;
}

.card-background-glow {
    position: absolute;
    top: -20px;
    left: -20px;
    right: -20px;
    bottom: -20px;
    background: radial-gradient(circle at 20% 50%, rgba(52, 152, 219, 0.1), transparent 70%);
    pointer-events: none;
    z-index: 0;
}

.card-portrait {
    width: 90px;
    height: 110px;
    position: relative;
    margin-top: -30px;
    margin-left: -10px;
    flex-shrink: 0;
    z-index: 5;
}

.card-portrait img {
    width: auto;
    height: 140px;
    object-fit: contain;
    filter: drop-shadow(0 8px 16px rgba(0,0,0,0.6));
}

.card-main { 
    flex: 1; 
    z-index: 5;
}

.card-title {
    display: flex;
    flex-direction: column;
    margin-bottom: 2px;
}

.name { 
    font-weight: 900; 
    color: #fff; 
    font-size: 1.1rem; 
    letter-spacing: -0.5px;
}

.protagonist-badge {
    background: var(--accent-color);
    color: #fff;
    font-size: 0.55rem;
    font-weight: 900;
    padding: 2px 6px;
    border-radius: 4px;
    width: fit-content;
    margin-top: 4px;
}

.card-id { 
    font-size: 0.65rem; 
    color: var(--text-dim); 
    font-family: 'JetBrains Mono', monospace; 
    margin-bottom: 12px;
    letter-spacing: 0.5px;
}

.card-stats {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 8px;
}

.stat-item {
    display: flex;
    flex-direction: column;
    padding: 4px 8px;
    background: rgba(255, 255, 255, 0.03);
    border-radius: var(--radius-sm);
    border: 1px solid rgba(255, 255, 255, 0.05);
}

.stat-item .label {
    font-size: 0.55rem;
    color: var(--text-dim);
    font-weight: 800;
}

.stat-item .val {
    font-size: 0.75rem;
    color: #fff;
    font-weight: 600;
}
</style>


