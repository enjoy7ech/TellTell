<script setup lang="ts">
import CharacterSelector from './CharacterSelector.vue';
import PortraitSelector from './PortraitSelector.vue';
import ChoiceListEditor from './ChoiceListEditor.vue';
import ActionListEditor from './ActionListEditor.vue';
import SceneSelector from './SceneSelector.vue';

const props = defineProps<{
    modelValue: any;
    characterIds: string[];
    characterProfiles: Map<string, any>;
    portraitHandles: Map<string, Map<string, any>>;
    portraitUrls: Map<string, string>;
    sceneHandles: Map<string, any>;
    sceneUrls: Map<string, string>;
    nodeIds: string[];
}>();

const emit = defineEmits(['update:modelValue', 'change']);

function handleChange() {
    emit('change');
}
</script>

<template>
    <div class="frame-editor-v3" @input="handleChange" @change="handleChange">
        <div class="prop-group">
            <div class="label-row">
                <el-icon><UserFilled /></el-icon> 立绘/表情 (CHARACTER)
            </div>
            <div class="dual-selector">
                <CharacterSelector 
                    v-model="modelValue.dialog.char"
                    :character-ids="characterIds"
                    :character-profiles="characterProfiles"
                    :portrait-handles="portraitHandles"
                    :portrait-urls="portraitUrls"
                />
                <PortraitSelector 
                    v-model="modelValue.dialog.pic"
                    :char-id="modelValue.dialog.char"
                    :portrait-urls="portraitUrls"
                    :portrait-handles="portraitHandles"
                    placeholder="表情立绘"
                />
            </div>
        </div>

        <div class="prop-group" style="margin-top: 16px;">
            <div class="label-row">
                <el-icon><ChatLineRound /></el-icon> 对话文本 (DIALOG)
            </div>
            <el-input 
                v-model="modelValue.dialog.text" 
                type="textarea" 
                :rows="4" 
                placeholder="请输入剧情文本..." 
                class="dialog-input"
                size="small"
            />
        </div>

        <div class="prop-group-grid" style="margin-top: 20px;">
            <div class="prop-group">
                <div class="label-row">背景与悬浮文本 (SCENE)</div>
                <SceneSelector 
                    v-model="modelValue.screen.pic" 
                    :scene-urls="sceneUrls"
                    :scene-handles="sceneHandles"
                    placeholder="选择背景图..."
                    style="margin-bottom: 8px;"
                />
            </div>
            <div class="prop-group">
                <div class="label-row">过场效果 (FX)</div>
                <el-select v-model="modelValue.transition" placeholder="效果" size="small">
                    <el-option label="渐变 (Fade)" value="fade" />
                    <el-option label="模糊 (Blur)" value="blur" />
                    <el-option label="像素化 (Pixel)" value="pixel" />
                    <el-option label="推入 (Push)" value="push" />
                    <el-option label="切入 (None)" value="" />
                </el-select>
            </div>
        </div>

        <el-input type="textarea" :rows="3" v-model="modelValue.screen.text" placeholder="场景悬浮文本..." size="small" />


        <div class="frame-logic-group" style="margin-top: 32px;">
            <div class="tiny-title">互动选项 (CHOICES)</div>
            <ChoiceListEditor 
                v-model="modelValue.choice" 
                :node-ids="nodeIds"
                :character-ids="characterIds"
                :character-profiles="characterProfiles"
                :portrait-handles="portraitHandles"
                :portrait-urls="portraitUrls"
            />
        </div>

        <div class="frame-logic-group" style="margin-top: 32px;">
            <ActionListEditor 
                title="进入分镜前 (PRE)" 
                v-model="modelValue.pre" 
                allowed-type="action"
                :character-ids="characterIds"
                :character-profiles="characterProfiles"
                :portrait-handles="portraitHandles"
                :portrait-urls="portraitUrls"
            />
            <ActionListEditor 
                title="离开分镜后 (POST)" 
                v-model="modelValue.post" 
                allowed-type="action"
                :character-ids="characterIds"
                :character-profiles="characterProfiles"
                :portrait-handles="portraitHandles"
                :portrait-urls="portraitUrls"
            />
        </div>
    </div>
</template>

<style scoped>
.frame-editor-v3 {
    display: flex;
    flex-direction: column;
}

.dual-selector {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 12px;
}

.prop-group-grid {
    display: grid;
    grid-template-columns: 1.5fr 1fr;
    gap: 20px;
}

.label-row {
    font-size: 0.7rem;
    color: #94a3b8;
    margin-bottom: 8px;
    text-transform: uppercase;
    font-weight: 800;
    display: flex;
    align-items: center;
    gap: 6px;
    letter-spacing: 0.5px;
}

.tiny-title {
    font-size: 0.65rem;
    font-weight: 900;
    color: #cbd5e1;
    margin-bottom: 12px;
    letter-spacing: 1.2px;
    text-transform: uppercase;
    border-bottom: 1px solid #f1f5f9;
    padding-bottom: 8px;
}

:deep(.el-input__inner), :deep(.el-textarea__inner) {
    font-size: 0.8rem !important;
}

.frame-logic-group {
    background: #f8fafc;
    padding: 16px;
    border-radius: 12px;
    border: 1px solid #f1f5f9;
}
</style>
