<script setup lang="ts">
import { computed, inject } from 'vue';
import CharacterSelector from './CharacterSelector.vue';
import StoryNodeSelect from './StoryNodeSelect.vue';
import GlobalMetadata from '@telltell/core/meta/meta.json';
import { Plus, Delete } from '@element-plus/icons-vue';

const props = defineProps<{
    title: string;
    modelValue: any[];
    state: any;
    allowedType?: 'action' | 'judge'; // Filter by function type
    allowedModules?: string[]; // Optional whitelist for modules
}>();

const allNodes = inject<any>('all-nodes');
const allNodeIds = computed(() => props.state.editorService?.getAllNodeIds() || []);

const emit = defineEmits(['update:modelValue']);

// Use consolidated metadata as the source of truth
const ACTION_MODULES: any = {
    ...GlobalMetadata
};

// Transform metadata into el-cascader options with optional filtering
const cascaderOptions = computed(() => {
    let entries = Object.entries(ACTION_MODULES);
    
    if (props.allowedModules && props.allowedModules.length > 0) {
        entries = entries.filter(([modId]) => props.allowedModules!.includes(modId));
    }

    const options = entries.map(([modId, mod]: [string, any]) => {
        let funcs: any[] = Object.entries(mod.funcs);
        
        // Filter by type if specified
        if (props.allowedType) {
            funcs = funcs.filter(([_fId, f]: [string, any]) => f.type === props.allowedType);
        }

        if (funcs.length === 0) return null;

        return {
            value: modId,
            label: mod.label || modId,
            children: funcs.map(([funcId, func]: [string, any]) => ({
                value: funcId,
                label: func.label || funcId
            }))
        };
    }).filter(Boolean); // Remote modules with no matching functions

    return options;
});

function addAction() {
    let currentList = props.modelValue || [];
    
    // Pick the first available module and function from the filtered options
    const options = cascaderOptions.value as any[];
    let newAction: any;
    
    if (options.length > 0) {
        const firstMod = options[0];
        const firstFunc = firstMod.children[0];
        newAction = { 
            module: firstMod.value, 
            func: firstFunc.value, 
            params: [] 
        };
    } else {
        // Fallback to any first module if no filter applies
        const firstModule = Object.keys(ACTION_MODULES)[0];
        const firstFunc = Object.keys(ACTION_MODULES[firstModule]?.funcs || {})[0];
        if (firstModule && ACTION_MODULES[firstModule]?.funcs) {
            newAction = { module: firstModule, func: firstFunc, params: [] };
        }
    }

    if (newAction) {
        emit('update:modelValue', [...currentList, newAction]);
    }
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
    "StoryNodeSelect": StoryNodeSelect,
    "el-input-number": "el-input-number",
    "el-select": "el-select",
    "el-input": "el-input"
};

function getFirstFrameText(nodeId: string) {
    if (!allNodes?.value || allNodes.value.length === 0) {
        return '--- (无节点数据) ---';
    }
    const node = allNodes.value.find((n: any) => {
        const id = (n.data?.id || n.id || "").toString().trim();
        return id === nodeId.toString().trim();
    });
    
    if (!node) return '未找到节点 (' + nodeId + ')';
    
    const display = node.data?.display || [];
    if (display.length === 0) return '节点内尚无分镜';
    
    const firstFrame = display[0];
    const text = (firstFrame.dialog?.text || "").trim() || (firstFrame.screen?.text || "").trim();
    return text || '(该分镜无对白内容)';
}
</script>

<template>
    <div class="action-list-editor">
        <div class="list-header">
            <span>{{ title }}</span>
            <el-button size="small" type="primary" plain :icon="Plus" @click="addAction">添加</el-button>
        </div>
        
        <div class="action-items">
            <div v-for="(act, idx) in modelValue" :key="idx" class="action-card">
                <div class="card-header">
                    <span class="idx-badge">#{{ (idx as number) + 1 }}</span>
                    <el-button size="small" circle :icon="Delete" @click="removeAction(idx)" type="danger" plain />
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
                                size="small"
                            />
                        </div>
                    </div>

                    <div class="params-row" v-if="ACTION_MODULES[act.module]?.funcs[act.func]?.params?.length > 0">
                        <div v-for="(pInfo, pIdx) in ACTION_MODULES[act.module].funcs[act.func].params" :key="pIdx" class="param-col">
                            <label>{{ pInfo.label || pInfo.name }}</label>
                            
                            <component 
                                :is="componentMap[pInfo.type] || 'el-input'" 
                                v-model="act.params[pIdx]"
                                v-bind="pInfo.props"
                                :character-ids="props.state.characterIds"
                                :character-profiles="props.state.characterProfiles"
                                :portrait-urls="props.state.portraitUrls"
                                :portrait-handles="props.state.portraitHandles"
                                :all-node-ids="allNodeIds"
                                :all-nodes="allNodes"
                                :placeholder="pInfo.label"
                            >
                                <template v-if="pInfo.props?.isNodeSelector">
                                    <el-option v-for="nid in allNodeIds" :key="nid" :label="nid" :value="nid">
                                        <el-popover
                                            placement="right"
                                            :width="260"
                                            trigger="hover"
                                            popper-class="story-node-preview-popover"
                                            :teleported="true"
                                        >
                                            <template #reference>
                                                <span>{{ nid }}</span>
                                            </template>
                                            <div class="preview-box">
                                                <div class="preview-tag">Story Preview</div>
                                                <div class="preview-main-text">{{ getFirstFrameText(nid) }}</div>
                                            </div>
                                        </el-popover>
                                    </el-option>
                                </template>
                            </component>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>
</template>

<style>
/* Global styles for popper content since it is detached from component scope */
.story-node-preview-popover {
    padding: 12px !important;
    border-radius: 8px !important;
    border: 1px solid #e2e8f0 !important;
    box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1) !important;
    background: #ffffff !important;
    z-index: 9999 !important;
}

.preview-box {
    display: flex;
    flex-direction: column;
    gap: 8px;
}

.preview-tag {
    font-size: 9px;
    font-weight: 800;
    color: #3b82f6;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    border-bottom: 1px solid #f1f5f9;
    padding-bottom: 4px;
}

.preview-main-text {
    font-size: 13px;
    line-height: 1.6;
    color: #1e293b;
    font-weight: 500;
    word-break: break-all;
    white-space: pre-wrap;
    font-family: inherit;
}
</style>

<style scoped>
.action-list-editor {
    margin-top: 8px;
    background: #f8fafc;
    border-radius: 10px;
    padding: 8px 10px;
    border: 1px solid #f1f5f9;
}

.list-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    font-size: 0.65rem;
    font-weight: 800;
    color: #94a3b8;
    margin-bottom: 8px;
    text-transform: uppercase;
    letter-spacing: 0.5px;
}

.action-card {
    background: #ffffff;
    border: 1px solid #e2e8f0;
    border-radius: 8px;
    padding: 8px 10px;
    margin-bottom: 6px;
    box-shadow: 0 1px 2px rgba(0,0,0,0.01);
}

.card-header {
    display: flex;
    justify-content: space-between;
    margin-bottom: 6px;
    align-items: center;
}

.idx-badge {
    color: #3b82f6;
    font-size: 0.6rem;
    font-weight: 800;
    opacity: 0.7;
}

.row {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 8px;
    margin-bottom: 8px;
}

.params-row {
    display: flex;
    gap: 6px;
    flex-wrap: wrap;
    background: #f8fafc;
    padding: 6px 8px;
    border-radius: 6px;
    border: 1px solid #f1f5f9;
    margin-top: 4px;
}

.param-col {
    flex: 1;
    min-width: 80px;
}

label {
    display: block;
    font-size: 0.6rem;
    color: #94a3b8;
    margin-bottom: 3px;
    text-transform: uppercase;
    font-weight: 850;
}

.single-row {
    grid-template-columns: 1fr;
    margin-bottom: 4px;
}

.full-width {
    width: 100%;
}

:deep(.el-cascader) {
    width: 100% !important;
}
</style>
