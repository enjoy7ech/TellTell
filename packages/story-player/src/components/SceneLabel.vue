<script setup lang="ts">
/**
 * SceneLabel.vue
 * 处理顶层/中心的剧情场景描述文字
 */
defineProps<{
  frame: {
    id: string;
    screenText: string;
  }
}>();
</script>

<template>
  <div class="floating-scene-label">
    <div class="label" v-text="frame.screenText"></div>
  </div>
</template>

<style scoped>
/* 我们可以把 index.css 里的样式搬过来，或者保持全局引用 */
</style>
