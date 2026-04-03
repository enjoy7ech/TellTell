<script setup lang="ts">
import CharacterSelector from './CharacterSelector.vue';
import GlobalMetadata from '@telltell/core/meta/meta.json';
import { computed } from 'vue';

const props = defineProps<{
    title: string;
    modelValue: any[];
    characterIds: string[];
    characterProfiles: Map<string, any>;
    portraitHandles: Map<string, Map<string, any>>;
    getImageUrl: (handle: any) => Promise<string>;
    allNodeIds?: string[];
    allowedModules?: string[]; // Optional whitelist for modules
}>();

const emit = defineEmits(['update:modelValue']);

// Use consolidated metadata as the source of truth
const ACTION_MODULES: any = {
    ...GlobalMetadata
};

// Transform metadata into el-cascader options with optional filtering
const cascaderOptions = computed(() => {
    let filteredEntries = Object.entries(ACTION_MODULES);
    
    if (props.allowedModules && props.allowedModules.length > 0) {
        filteredEntries = filteredEntries.filter(([modId]) => props.allowedModules!.includes(modId));
    }

    return filteredEntries.map(([modId, mod]: [string, any]) => ({
        value: modId,
        label: mod.label || modId,
        children: Object.entries(mod.funcs).map(([funcId, func]: [string, any]) => ({
            value: funcId,
            label: func.label || funcId
        }))
    }));
});

function addAction() {
    const firstModule = Object.keys(ACTION_MODULES)[0];
    const firstFunc = Object.keys(ACTION_MODULES[firstModule].funcs)[0];
    props.modelValue.push({ module: firstModule, func: firstFunc, params: [] });
    emit('update:modelValue', props.modelValue);
}

function removeAction(idx: number) {
    props.modelValue.splice(idx, 1);
    emit('update:modelValue', props.modelValue);
}

function onCascaderChange(val: any, idx: number) {
    if (val && val.length === 2) {
        const [mod, func] = val;
        props.modelValue[idx].module = mod;
        props.modelValue[idx].func = func;
        props.modelValue[idx].params = []; // Reset params when type changes
    }
}

// Map string type names to actual components or tag names
const componentMap: any = {
    "CharacterSelector": CharacterSelector,
    "el-input-number": "el-input-number",
    "el-select": "el-select",
    "el-input": "el-input"
};
</script>

<template>
    <div class="action-list-editor">
        <div class="list-header">
            <span>{{ title }}</span>
            <el-button size="small" type="success" plain icon="Plus" @click="addAction">添加</el-button>
        </div>
        
        <div class="action-items">
            <div v-for="(act, idx) in modelValue" :key="idx" class="action-card">
                <div class="card-header">
                    <span class="idx-badge">#{{ (idx as number) + 1 }}</span>
                    <el-button size="small" circle icon="Delete" @click="removeAction(idx)" type="danger" plain />
                </div>

                <div class="card-body">
                    <div class="row single-row">
                        <div class="col full-width">
                            <label>核心功能 / 动作</label>
                            <el-cascader 
                                :model-value="[act.module, act.func]" 
                                :options="cascaderOptions" 
                                @change="(val: any) => onCascaderChange(val, idx)"
                                placeholder="选择模块与动作"
                                :show-all-levels="true"
                                style="width: 100%;"
                                expand-trigger="hover"
                            />
                        </div>
                    </div>

                    <div class="params-row" v-if="ACTION_MODULES[act.module]?.funcs[act.func]">
                        <div v-for="(pInfo, pIdx) in ACTION_MODULES[act.module].funcs[act.func].params" :key="pIdx" class="param-col">
                            <label>{{ pInfo.label || pInfo.name }}</label>
                            
                            <component 
                                :is="componentMap[pInfo.type] || 'el-input'" 
                                v-model="act.params[pIdx]"
                                v-bind="pInfo.props"
                                :character-ids="pInfo.type === 'CharacterSelector' ? characterIds : undefined"
                                :character-profiles="pInfo.type === 'CharacterSelector' ? characterProfiles : undefined"
                                :portrait-handles="pInfo.type === 'CharacterSelector' ? portraitHandles : undefined"
                                :get-image-url="pInfo.type === 'CharacterSelector' ? getImageUrl : undefined"
                                :placeholder="pInfo.label"
                            >
                                <template v-if="pInfo.props?.isNodeSelector">
                                    <el-option v-for="nid in allNodeIds" :key="nid" :label="nid" :value="nid" />
                                </template>
                            </component>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>
</template>

<style scoped>
.action-list-editor {
    margin-top: 15px;
    background: rgba(0,0,0,0.1);
    border-radius: 8px;
    padding: 10px;
    border: 1px solid #333;
}

.list-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    font-size: 0.7rem;
    font-weight: bold;
    color: #666;
    margin-bottom: 8px;
    text-transform: uppercase;
    letter-spacing: 1px;
}

.action-card {
    background: rgba(40,40,40,0.4);
    border: 1px solid #333;
    border-radius: 6px;
    padding: 10px 12px;
    margin-bottom: 8px;
}

.card-header {
    display: flex;
    justify-content: space-between;
    margin-bottom: 8px;
    align-items: center;
}

.idx-badge {
    color: #3498db;
    font-size: 0.7rem;
    font-weight: bold;
    opacity: 0.8;
}

.row {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 8px;
    margin-bottom: 8px;
}

.params-row {
    display: flex;
    gap: 8px;
    flex-wrap: wrap;
    background: rgba(0,0,0,0.2);
    padding: 8px 10px;
    border-radius: 6px;
    border: 1px solid rgba(255,255,255,0.05);
}

.param-col {
    flex: 1;
    min-width: 100px;
}

label {
    display: block;
    font-size: 0.6rem;
    color: #666;
    margin-bottom: 4px;
    text-transform: uppercase;
    font-weight: bold;
}

/* Global Element Plus Dark Overrides for this component */
:deep(.el-input__wrapper), :deep(.el-textarea__inner), :deep(.el-input-number__wrapper) {
    background-color: #000 !important;
    box-shadow: 0 0 0 1px #333 inset !important;
}

:deep(.el-input__inner), :deep(.el-textarea__inner) {
    color: #fff !important;
}

:deep(.el-select) {
    width: 100%;
}
</style>

