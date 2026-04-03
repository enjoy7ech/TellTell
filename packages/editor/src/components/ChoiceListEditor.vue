<script setup lang="ts">
import ActionListEditor from './ActionListEditor.vue';
import { Delete, Plus } from '@element-plus/icons-vue';

const props = defineProps<{
    modelValue: any[];
    nodeIds: string[]; // Options for jump target
    // Pass data for ActionListEditor
    characterIds: string[];
    characterProfiles: Map<string, any>;
    portraitHandles: Map<string, Map<string, any>>;
    portraitUrls: Map<string, string>;
}>();

const emit = defineEmits(['update:modelValue']);

function addChoice() {
    const newList = [...(props.modelValue || [])];
    newList.push({ 
        text: "新选项", 
        target: "", 
        requirement: [], 
        action: [
            { module: 'Engine', func: 'next', params: [] }
        ] 
    });
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
                <el-input v-model="choice.text" placeholder="选项文字..." style="flex: 1.5;" @change="updateChoice" size="small" />
                <el-button size="small" circle :icon="Delete" @click="removeChoice(idx)" type="danger" plain />
            </div>
            <!-- Logic Editing -->
            <div class="choice-logic-container">
                  <ActionListEditor 
                    title="选项前置条件" 
                    v-model="choice.requirement" 
                    allowed-type="judge"
                    :character-ids="characterIds"
                    :character-profiles="characterProfiles"
                    :portrait-handles="portraitHandles"
                    :portrait-urls="portraitUrls"
                    :all-node-ids="nodeIds"
                    @change="updateChoice"
                 />
                 <ActionListEditor 
                    title="执行动作" 
                    v-model="choice.action" 
                    allowed-type="action"
                    :character-ids="characterIds"
                    :character-profiles="characterProfiles"
                    :portrait-handles="portraitHandles"
                    :portrait-urls="portraitUrls"
                    :all-node-ids="nodeIds"
                    @change="updateChoice"
                 />
            </div>
        </div>
        <el-button class="btn-add-choice" @click="addChoice" :icon="Plus" type="primary" plain>新增选项 (Choice)</el-button>
    </div>
</template>

<style scoped>
.choice-list-editor {
    display: flex;
    flex-direction: column;
    gap: 10px;
}

.choice-item {
    display: flex;
    flex-direction: column;
    padding: 10px 12px;
    background: #ffffff;
    border-radius: 10px;
    border: 1px solid #e2e8f0;
    border-left: 3px solid #3b82f6;
    box-shadow: 0 1px 2px rgba(0,0,0,0.01);
}

.choice-row {
    display: flex;
    gap: 8px;
    align-items: center;
}

.choice-logic-container {
    padding-top: 8px;
    border-top: 1px dashed #f1f5f9;
}

.btn-add-choice {
    width: 100%;
    font-weight: 800 !important;
    height: 32px !important;
    font-size: 0.75rem !important;
}

:deep(.el-select) {
    width: 100%;
}
</style>
