<script setup lang="ts">
defineProps<{
    modelValue: string;
    placeholder?: string;
    disabled?: boolean;
    label?: string;
}>();

defineEmits(['update:modelValue', 'change', 'blur', 'focus']);
</script>

<template>
    <div class="base-textarea-container" :class="{ 'has-label': label, 'is-disabled': disabled }">
        <label v-if="label" class="base-label">{{ label }}</label>
        <textarea 
            class="base-textarea-field"
            :value="modelValue"
            :placeholder="placeholder"
            :disabled="disabled"
            @input="$emit('update:modelValue', ($event.target as HTMLTextAreaElement).value)"
            @change="$emit('change', $event)"
            @blur="$emit('blur', $event)"
            @focus="$emit('focus', $event)"
        ></textarea>
    </div>
</template>

<style scoped>
.base-textarea-container {
    width: 100%;
    display: flex;
    flex-direction: column;
    gap: 4px;
}

.base-label {
    font-size: 0.65rem;
    color: #666;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    font-weight: 600;
}

.base-textarea-field {
    width: 100%;
    min-height: 80px;
    background: #0a0a0a;
    border: 1px solid #222;
    border-radius: 8px;
    padding: 10px 12px;
    color: #eee;
    font-size: 0.85rem;
    font-family: inherit;
    outline: none;
    transition: all 0.2s;
    resize: vertical;
}

.base-textarea-field:focus {
    border-color: #3498db;
    box-shadow: 0 0 0 3px rgba(52, 152, 219, 0.15);
    background: #0f0f0f;
}

.is-disabled .base-textarea-field {
    opacity: 0.5;
    background: #111;
    cursor: not-allowed;
    border-color: #222;
}
</style>
