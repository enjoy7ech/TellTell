<script setup lang="ts">
import { ref, nextTick, onUnmounted } from 'vue';
import { createPopper } from '@popperjs/core';

const props = withDefaults(defineProps<{
    modelValue: string;
    characterIds: string[];
    characterProfiles: Map<string, any>;
    portraitUrls: Map<string, string>;
    portraitHandles: Map<string, Map<string, any>>;
    placeholder?: string;
    disabled?: boolean;
    size?: any;
}>(), {
    size: 'small'
});

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
    
    let portraitUrl = '';
    if (targetPortraitKey) {
        portraitUrl = props.portraitUrls.get(`${id}/${targetPortraitKey}`) || '';
    }
    
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
            clearable
            filterable
            class="full-width"
            popper-class="character-select-dropdown"
            :size="size"
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

        <!-- Floating Preview Card (White Style Restoration) -->
        <Teleport to="body">
            <div ref="previewCardRef" class="char-mini-card">
                <div class="card-inner" v-if="previewData">
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
    color: #475569;
}

.item-id {
    font-weight: 700;
    font-size: 0.85rem;
}

.item-name {
    font-size: 0.7rem;
    color: #94a3b8;
    font-weight: 800;
}

/* Float Preview Card - White Style Restoration */
.char-mini-card {
    position: fixed;
    z-index: 10000;
    pointer-events: none;
    background: #ffffff;
    border: 1px solid #e2e8f0;
    border-radius: 12px;
    padding: 16px;
    box-shadow: 0 20px 50px rgba(0,0,0,0.1), 0 4px 12px rgba(0,0,0,0.02);
    min-width: 260px;
    
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

.card-portrait {
    width: 80px;
    height: 100px;
    position: relative;
    margin-top: -30px;
    margin-left: -10px;
    flex-shrink: 0;
    z-index: 5;
}

.card-portrait img {
    width: auto;
    height: 130px;
    object-fit: contain;
    filter: drop-shadow(0 4px 8px rgba(0,0,0,0.1));
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
    color: #1e293b; 
    font-size: 1.1rem; 
    letter-spacing: -0.5px;
}

.protagonist-badge {
    background: #fef3c7;
    color: #d97706;
    font-size: 0.55rem;
    font-weight: 900;
    padding: 2px 6px;
    border-radius: 4px;
    width: fit-content;
    margin-top: 4px;
    border: 1px solid #fde68a;
}

.card-id { 
    font-size: 0.65rem; 
    color: #94a3b8; 
    font-family: 'JetBrains Mono', monospace; 
    margin-bottom: 12px;
    letter-spacing: 0.5px;
    font-weight: 700;
}

.card-stats {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 8px;
}

.stat-item {
    display: flex;
    flex-direction: column;
    padding: 6px 10px;
    background: #f8fafc;
    border-radius: 6px;
    border: 1px solid #f1f5f9;
}

.stat-item .label {
    font-size: 0.55rem;
    color: #94a3b8;
    font-weight: 900;
}

.stat-item .val {
    font-size: 0.8rem;
    color: #334155;
    font-weight: 800;
}
</style>
