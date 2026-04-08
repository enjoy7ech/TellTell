<script setup lang="ts">
import { computed } from 'vue';
/**
 * DialogueHUD.vue
 * 处理对话框、角色名称以及分支选项
 */
const props = defineProps<{
    frame: {
        name: string;
        text: string;
        choices: any[];
    };
    engine: any;
}>();

const emit = defineEmits(['choiceClick']);

const handleChoice = (choice: any) => {
    emit('choiceClick', choice);
};

const hasDialogue = computed(() => props.frame.text || props.frame.name);
const hasChoices = computed(() => props.frame.choices.length > 0);
</script>

<template>
    <div v-if="hasDialogue || hasChoices" class="dialogue-system">
        <!-- 对话主体层 -->
        <div class="dialogue-box" v-if="hasDialogue">
            <div v-if="frame.name" class="dialogue-name">{{ frame.name }}</div>
            <div v-if="frame.text" class="dialogue-content">{{ frame.text }}</div>
            <div class="dialogue-next-arrow" v-if="!hasChoices"></div>
        </div>

        <!-- 分支选项层 -->
        <div v-if="hasChoices" class="choice-container">
            <div 
                v-for="(choice, idx) in frame.choices" 
                :key="idx" 
                class="choice-btn" 
                @click.stop="handleChoice(choice)"
            >
                {{ choice.text }}
            </div>
        </div>
    </div>
</template>

<style scoped>
/* 保持对 index.css 的依赖或按需迁移 */
</style>
