<script setup lang="ts">
import { computed } from 'vue';
import BaseSelect from './BaseSelect.vue';

const props = defineProps<{
    modelValue: string; // Format: "MM-DD"
    label?: string;
    disabled?: boolean;
}>();

const emit = defineEmits(['update:modelValue']);

const months = Array.from({ length: 12 }, (_, i) => ({
    label: (i + 1).toString().padStart(2, '0') + ' 月',
    value: (i + 1).toString().padStart(2, '0')
}));

const days = computed(() => {
    const parts = props.modelValue.split('-');
    const m = parseInt(parts[0]) || 1;
    const daysInMonth = new Date(2024, m, 0).getDate(); // leap year 2024 for 29 Feb
    return Array.from({ length: daysInMonth }, (_, i) => ({
        label: (i + 1).toString().padStart(2, '0') + ' 日',
        value: (i + 1).toString().padStart(2, '0')
    }));
});

function updateMonth(m: string) {
    const parts = props.modelValue.split('-');
    const oldD = parts[1] || '01';
    // Ensure day is valid for new month
    const daysInMonth = new Date(2024, parseInt(m), 0).getDate();
    const newD = parseInt(oldD) > daysInMonth ? '01' : oldD;
    emit('update:modelValue', `${m}-${newD}`);
}

function updateDay(d: string) {
    const parts = props.modelValue.split('-');
    const m = parts[0] || '01';
    emit('update:modelValue', `${m}-${d}`);
}

const currentMonth = computed(() => props.modelValue.split('-')[0] || '01');
const currentDay = computed(() => props.modelValue.split('-')[1] || '01');

</script>

<template>
    <div class="base-date-picker">
        <label v-if="label" class="base-label">{{ label }}</label>
        <div class="picker-row">
            <BaseSelect 
                :model-value="currentMonth"
                @update:model-value="updateMonth"
                :options="months"
                :disabled="disabled"
            />
            <div class="sep">-</div>
            <BaseSelect 
                :model-value="currentDay"
                @update:model-value="updateDay"
                :options="days"
                :disabled="disabled"
            />
        </div>
    </div>
</template>

<style scoped>
.base-date-picker {
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

.picker-row {
    display: flex;
    align-items: center;
    gap: 8px;
}

.sep {
    color: #333;
    font-weight: bold;
}
</style>
