<script setup lang="ts">
import { ref } from 'vue';
import { UserFilled, ChatLineRound, Connection, MagicStick } from '@element-plus/icons-vue';
import CharacterSelector from './CharacterSelector.vue';
import PortraitSelector from './PortraitSelector.vue';
import ChoiceListEditor from './ChoiceListEditor.vue';
import ActionListEditor from './ActionListEditor.vue';
import SceneSelector from './SceneSelector.vue';

const props = defineProps<{
    modelValue: any;
    state: any;
}>();

const emit = defineEmits(['update:modelValue', 'change']);
const isAILoading = ref(false);

function handleChange() {
    emit('change');
}

async function generateAIContent() {
    if (!props.state.geminiService) {
        alert("请在侧边栏配置 Gemini API Key");
        return;
    }

    isAILoading.value = true;
    try {
        const dialog = await props.state.geminiService.generateDialog({
            charName: props.modelValue.dialog.char,
            plot: "当前正在编写剧本中...",
            lastDialogs: [],
            userDraft: props.modelValue.dialog.text // PASS CURRENT INPUT HERE
        });
        props.modelValue.dialog.text = dialog;
        emit('change');
    } finally {
        isAILoading.value = false;
    }
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
                    :character-ids="props.state.characterIds"
                    :character-profiles="props.state.characterProfiles"
                    :portrait-handles="props.state.portraitHandles"
                    :portrait-urls="props.state.portraitUrls"
                />
                <PortraitSelector 
                    v-model="modelValue.dialog.pic"
                    :char-id="modelValue.dialog.char"
                    :portrait-urls="props.state.portraitUrls"
                    :portrait-handles="props.state.portraitHandles"
                    placeholder="表情立绘"
                />
            </div>
        </div>

        <div class="prop-group" style="margin-top: 16px;">
            <div class="label-row">
                <el-icon><ChatLineRound /></el-icon> 对话文本 (DIALOG)
            </div>
            <div class="dialog-input-wrapper">
                <el-input 
                    v-model="modelValue.dialog.text" 
                    type="textarea" 
                    :rows="4" 
                    placeholder="请输入剧情文本..." 
                    class="dialog-input"
                    size="small"
                />
                <el-tooltip :content="props.state.geminiService ? '使用 Gemini 生成建议台词' : '未配置 Gemini API Key'" placement="left">
                    <el-button 
                        class="ai-gen-btn" 
                        :class="{ loading: isAILoading }"
                        :icon="MagicStick" 
                        circle 
                        size="small"
                        @click="generateAIContent"
                    />
                </el-tooltip>
            </div>
        </div>

        <div class="prop-group-grid" style="margin-top: 20px;">
            <div class="prop-group">
                <div class="label-row">背景与悬浮文本 (SCENE)</div>
                <SceneSelector 
                    v-model="modelValue.screen.pic" 
                    :scene-urls="props.state.sceneUrls"
                    :scene-handles="props.state.sceneHandles"
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

        <div class="prop-group" style="margin-top: 16px;">
             <div class="label-row">
                <el-icon><Connection /></el-icon> 选项分支 (BRANCHES)
            </div>
            <ChoiceListEditor 
                v-model="modelValue.choice"
                :state="props.state"
                @change="handleChange"
            />
        </div>

        <div class="prop-group" style="margin-top: 16px;">
            <div class="label-row">
                <el-icon><Connection /></el-icon> 分镜前置/进入逻辑 (PRE)
            </div>
            <ActionListEditor 
                title="进入分镜前 (PRE)"
                v-model="modelValue.pre" 
                allowed-type="action"
                :state="props.state"
                @change="handleChange"
            />
        </div>

        <div class="prop-group" style="margin-top: 16px;">
            <div class="label-row">
                <el-icon><Connection /></el-icon> 分镜后置/离开逻辑 (POST)
            </div>
            <ActionListEditor 
                title="离开分镜后 (POST)"
                v-model="modelValue.post" 
                allowed-type="action" 
                :state="props.state"
                @change="handleChange"
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

.dialog-input-wrapper {
    position: relative;
    display: flex;
    flex-direction: column;
}

.ai-gen-btn {
    position: absolute;
    bottom: 8px;
    right: 8px;
    background: linear-gradient(135deg, #a855f7 0%, #3b82f6 100%);
    border: none;
    color: white;
    box-shadow: 0 4px 12px rgba(168, 85, 247, 0.4);
    transition: all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275);
    z-index: 10;
}

.ai-gen-btn:hover {
    transform: scale(1.15) rotate(5deg);
    box-shadow: 0 6px 16px rgba(168, 85, 247, 0.6);
}

.ai-gen-btn.loading {
    animation: sparkle 1.5s infinite linear;
}

@keyframes sparkle {
    0% { filter: hue-rotate(0deg) brightness(1); }
    50% { filter: hue-rotate(180deg) brightness(1.5); }
    100% { filter: hue-rotate(360deg) brightness(1); }
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
