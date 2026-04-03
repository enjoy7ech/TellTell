<script setup lang="ts">
import ActionListEditor from './ActionListEditor.vue';

const props = defineProps<{
    modelValue: any[];
    nodeIds: string[]; // Options for jump target
    // Pass data for ActionListEditor
    characterIds: string[];
    characterProfiles: Map<string, any>;
    portraitHandles: Map<string, Map<string, any>>;
    getImageUrl: (handle: any) => Promise<string>;
}>();

const emit = defineEmits(['update:modelValue']);

function addChoice() {
    const newList = [...(props.modelValue || [])];
    newList.push({ text: "新选项", target: "", requirement: [] });
    emit('update:modelValue', newList);
}

function removeChoice(idx: number) {
    const newList = [...(props.modelValue || [])];
    newList.splice(idx, 1);
    emit('update:modelValue', newList);
}

function updateChoice() {
    emit('update:modelValue', props.modelValue);
}

</script>

<template>
    <div class="choice-list-editor">
        <div v-for="(choice, idx) in modelValue" :key="idx" class="choice-item">
            <div class="choice-row">
                <el-input v-model="choice.text" placeholder="选项文字..." style="flex: 2;" @change="updateChoice" />
                <el-select 
                    v-model="choice.target" 
                    placeholder="跳转至节点..." 
                    style="flex: 1;"
                    filterable
                    @change="updateChoice">
                    <el-option label="-- 无跳转 (顺延) --" value="" />
                    <el-option v-for="nodeId in nodeIds" :key="nodeId" :label="nodeId" :value="nodeId" />
                </el-select>
                <el-button size="small" circle icon="Delete" @click="removeChoice(idx)" type="danger" plain />
            </div>
            <!-- Requirements Editing -->
            <div class="choice-requirement-container">
                 <ActionListEditor 
                    title="按钮可用条件" 
                    v-model="choice.requirement" 
                    :allowed-modules="['Requirement']"
                    :character-ids="characterIds"
                    :character-profiles="characterProfiles"
                    :portrait-handles="portraitHandles"
                    :get-image-url="getImageUrl"
                    @change="updateChoice"
                 />
            </div>
        </div>
        <el-button class="btn-add-choice" @click="addChoice" icon="Plus" type="primary" plain>新增选项 (Choice)</el-button>
    </div>
</template>

<style scoped>
.choice-list-editor {
    display: flex;
    flex-direction: column;
    gap: 6px;
}

.choice-item {
    display: flex;
    flex-direction: column;
    padding: 8px;
    background: rgba(0,0,0,0.1);
    border-radius: 4px;
    border-left: 2px solid var(--accent-color);
}

.choice-row {
    display: flex;
    gap: 8px;
    align-items: center;
}

.choice-requirement-container {
    margin-top: 8px;
    padding-left: 12px;
}

.btn-add-choice {
    width: 100%;
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

