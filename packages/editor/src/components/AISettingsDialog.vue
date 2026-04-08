<script setup lang="ts">
import { ref, reactive } from 'vue';
import { Brush, Edit, Setting } from '@element-plus/icons-vue';

const props = defineProps<{
    visible: boolean;
}>();

const emit = defineEmits(['update:visible', 'saved']);

const activeTab = ref('art');

const settings = reactive({
    artStyle: localStorage.getItem('ai_art_style') || '日系二次元，赛博朋克深渊，高色比，精细线条',
    writingStyle: localStorage.getItem('ai_writing_style') || '轻小说风格，细腻的心理描写，适度的幽默感',
    temperature: Number(localStorage.getItem('ai_temperature')) || 0.9,
    topP: Number(localStorage.getItem('ai_top_p')) || 0.95,
});

function handleSave() {
    localStorage.setItem('ai_art_style', settings.artStyle);
    localStorage.setItem('ai_writing_style', settings.writingStyle);
    localStorage.setItem('ai_temperature', settings.temperature.toString());
    localStorage.setItem('ai_top_p', settings.topP.toString());
    
    emit('saved', { ...settings });
    emit('update:visible', false);
}

function handleClose() {
    emit('update:visible', false);
}
</script>

<template>
    <el-dialog
        :model-value="visible"
        @update:model-value="(val: any) => emit('update:visible', val)"
        title="AI 创作设定"
        width="600px"
        class="ai-settings-dialog"
        :show-close="true"
        append-to-body
        destroy-on-close
    >
        <div class="dialog-content">
            <el-tabs v-model="activeTab" tab-position="left" class="settings-tabs">
                <el-tab-pane name="art">
                    <template #label>
                        <div class="tab-label">
                            <el-icon><Brush /></el-icon>
                            <span>美术风格</span>
                        </div>
                    </template>
                    <div class="pane-content">
                        <h3>全局美术风格描述</h3>
                        <p class="hint">这些描述将自动附加到每次图片生成请求中。</p>
                        <el-input
                            v-model="settings.artStyle"
                            type="textarea"
                            :rows="6"
                            placeholder="例如：日系二次元，赛博朋克深渊，高色比，精细线条..."
                        />
                    </div>
                </el-tab-pane>
                
                <el-tab-pane name="writing">
                    <template #label>
                        <div class="tab-label">
                            <el-icon><Edit /></el-icon>
                            <span>文笔风格</span>
                        </div>
                    </template>
                    <div class="pane-content">
                        <h3>全局文笔风格描述</h3>
                        <p class="hint">这些描述将用于引导对话生成和剧情建议。</p>
                        <el-input
                            v-model="settings.writingStyle"
                            type="textarea"
                            :rows="6"
                            placeholder="例如：轻小说风格，细腻的心理描写，适度的幽默感..."
                        />
                    </div>
                </el-tab-pane>

                <el-tab-pane name="config">
                    <template #label>
                        <div class="tab-label">
                            <el-icon><Setting /></el-icon>
                            <span>高级配置</span>
                        </div>
                    </template>
                    <div class="pane-content">
                        <h3>模型参数控制</h3>
                        <div class="config-item">
                            <div class="label-row">
                                <span>Temperature (随机性)</span>
                                <span class="val">{{ settings.temperature }}</span>
                            </div>
                            <el-slider v-model="settings.temperature" :min="0" :max="2" :step="0.1" />
                        </div>
                        <div class="config-item">
                            <div class="label-row">
                                <span>Top P (核心采样)</span>
                                <span class="val">{{ settings.topP }}</span>
                            </div>
                            <el-slider v-model="settings.topP" :min="0" :max="1" :step="0.05" />
                        </div>
                    </div>
                </el-tab-pane>
            </el-tabs>
        </div>
        
        <template #footer>
            <div class="dialog-footer">
                <el-button @click="handleClose">取消</el-button>
                <el-button type="primary" @click="handleSave" class="save-btn">
                    保存设定
                </el-button>
            </div>
        </template>
    </el-dialog>
</template>

<style scoped>
.ai-settings-dialog :deep(.el-dialog) {
    border-radius: 16px;
    overflow: hidden;
    box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
}

.ai-settings-dialog :deep(.el-dialog__header) {
    margin: 0;
    padding: 20px 24px;
    border-bottom: 1px solid #f1f5f9;
}

.ai-settings-dialog :deep(.el-dialog__title) {
    font-weight: 800;
    color: #0f172a;
    font-size: 1.1rem;
}

.dialog-content {
    min-height: 300px;
}

.settings-tabs {
    height: 350px;
}

.tab-label {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 8px 0;
}

.pane-content {
    padding: 0 24px;
}

.pane-content h3 {
    margin: 0 0 8px 0;
    font-size: 0.95rem;
    font-weight: 700;
    color: #1e293b;
}

.hint {
    font-size: 0.75rem;
    color: #64748b;
    margin-bottom: 16px;
}

.config-item {
    margin-bottom: 24px;
}

.label-row {
    display: flex;
    justify-content: space-between;
    margin-bottom: 8px;
    font-size: 0.8rem;
    font-weight: 600;
    color: #475569;
}

.label-row .val {
    color: #3b82f6;
    font-family: 'JetBrains Mono', monospace;
}

.dialog-footer {
    padding: 10px 0;
}

.save-btn {
    background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);
    border: none;
    font-weight: 700;
    padding: 10px 24px;
}

:deep(.el-tabs__item) {
    font-weight: 600;
    color: #64748b;
}

:deep(.el-tabs__item.is-active) {
    color: #3b82f6;
    background: #eff6ff;
}

:deep(.el-textarea__inner) {
    border-radius: 12px;
    padding: 12px;
    font-family: inherit;
    font-size: 0.85rem;
    line-height: 1.6;
}
</style>
