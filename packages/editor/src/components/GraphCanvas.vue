<script setup lang="ts">
import { ref } from 'vue';

const canvasEl = ref<HTMLCanvasElement | null>(null);

defineExpose({
    canvasEl
});
</script>

<template>
    <div class="canvas-wrapper">
        <canvas ref="canvasEl"></canvas>
    </div>
</template>

<style scoped>
.canvas-wrapper {
    flex: 1;
    position: relative;
    overflow: hidden;
    background-image:
        radial-gradient(circle, #333 1px, transparent 1px);
    background-size: 20px 20px;
    background-color: #0f0f0f;
}

canvas {
    display: block;
}
</style>
