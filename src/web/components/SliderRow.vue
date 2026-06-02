<template>
  <div class="slider-row">
    <div class="slider-header">
      <span class="slider-label">{{ label }}</span>
      <span class="slider-value" :style="{ color: valorColor }">{{ formattedValue }} {{ unit }}</span>
    </div>
    <input
      type="range"
      :min="min"
      :max="max"
      :step="step"
      :value="modelValue"
      @input="$emit('update:modelValue', parseFloat(($event.target as HTMLInputElement).value))"
      class="slider"
    />
    <div class="slider-range">
      <span>{{ min }}</span>
      <span>{{ max }}</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';

const props = defineProps<{
  label: string;
  modelValue: number;
  min: number;
  max: number;
  step: number;
  unit: string;
}>();

defineEmits<{ (e: 'update:modelValue', v: number): void }>();

const formattedValue = computed(() => {
  if (props.step >= 1) return Math.round(props.modelValue).toString();
  return props.modelValue.toFixed(1);
});

const valorColor = computed(() => {
  const ratio = (props.modelValue - props.min) / (props.max - props.min);
  if (ratio < 0.3) return '#22c55e';
  if (ratio < 0.7) return '#f59e0b';
  return '#ef4444';
});
</script>

<style scoped>
.slider-row {
  margin-bottom: 0.6rem;
}

.slider-header {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  margin-bottom: 0.2rem;
}

.slider-label {
  font-size: 0.82rem;
  color: #cbd5e1;
}

.slider-value {
  font-size: 0.82rem;
  font-weight: 600;
  font-variant-numeric: tabular-nums;
}

.slider {
  width: 100%;
  height: 4px;
  -webkit-appearance: none;
  appearance: none;
  background: rgba(148, 163, 184, 0.2);
  border-radius: 2px;
  outline: none;
  cursor: pointer;
}

.slider::-webkit-slider-thumb {
  -webkit-appearance: none;
  width: 14px;
  height: 14px;
  border-radius: 50%;
  background: #3b82f6;
  border: 2px solid #1e293b;
  cursor: pointer;
  transition: transform 0.1s;
}

.slider::-webkit-slider-thumb:hover {
  transform: scale(1.2);
  background: #60a5fa;
}

.slider-range {
  display: flex;
  justify-content: space-between;
  font-size: 0.7rem;
  color: #64748b;
  margin-top: 0.1rem;
}
</style>
