<script setup lang="ts">


const props = defineProps<{
    modelValue: string;
    allNodeIds?: string[];
    placeholder?: string;
}>();

const emit = defineEmits(['update:modelValue']);

function handleChange(val: string) {
    emit('update:modelValue', val);
}
</script>

<template>
    <el-select 
        :model-value="modelValue" 
        @change="handleChange" 
        filterable 
        style="width: 100%;"
        :placeholder="placeholder || '选择剧情节点...'"
    >
        <el-option label="-- 无剧情跳转 --" value="" />
        <el-option v-for="id in allNodeIds" :key="id" :label="id" :value="id" />
    </el-select>
</template>

<style scoped>
:deep(.el-select__wrapper) {
    background-color: var(--bg-hover) !important;
}
</style>
