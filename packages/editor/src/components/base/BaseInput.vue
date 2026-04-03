<script setup lang="ts">
defineProps<{
    modelValue: string | number;
    type?: string;
    placeholder?: string;
    disabled?: boolean;
    label?: string;
    icon?: string;
    suffix?: string;
}>();

const emit = defineEmits(['update:modelValue', 'change', 'blur', 'focus']);

function onInput(e: Event) {
    const val = (e.target as HTMLInputElement).value;
    emit('update:modelValue', val);
}
</script>

<template>
    <div class="base-input-container" :class="{ 'has-label': label, 'is-disabled': disabled }">
        <label v-if="label" class="base-label">{{ label }}</label>
        <div class="input-wrapper">
            <span v-if="icon" class="input-icon">{{ icon }}</span>
            <input 
                :type="type || 'text'"
                :value="modelValue"
                :placeholder="placeholder"
                :disabled="disabled"
                @input="onInput"
                @change="$emit('change', $event)"
                @blur="$emit('blur', $event)"
                @focus="$emit('focus', $event)"
                class="base-input-field"
            />
            <span v-if="suffix" class="input-suffix">{{ suffix }}</span>
        </div>
    </div>
</template>

<style scoped>
.base-input-container {
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

.input-wrapper {
    position: relative;
    display: flex;
    align-items: center;
    background: #0a0a0a;
    border: 1px solid #222;
    border-radius: 8px;
    padding: 2px 10px;
    transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
    min-height: 34px;
}

.input-wrapper:focus-within {
    border-color: #3498db;
    box-shadow: 0 0 0 3px rgba(52, 152, 219, 0.15);
    background: #0f0f0f;
}

.input-icon {
    margin-right: 8px;
    font-size: 0.9rem;
    opacity: 0.6;
}

.base-input-field {
    flex: 1;
    background: transparent;
    border: none;
    color: #eee;
    font-size: 0.85rem;
    outline: none;
    width: 100%;
    padding: 6px 0;
}

.input-suffix {
    margin-left: 8px;
    font-size: 0.7rem;
    color: #444;
    font-weight: bold;
}

.is-disabled .input-wrapper {
    opacity: 0.5;
    background: #111;
    cursor: not-allowed;
}

.is-disabled input {
    cursor: not-allowed;
}
</style>
