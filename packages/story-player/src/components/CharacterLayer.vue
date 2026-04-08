<script setup lang="ts">
/**
 * CharacterLayer.vue
 * 专门处理剧情角色的立绘显示与入场动画
 */
const props = defineProps<{
    characters: string[];
    look: Record<string, string>;
    resolveAssetPath: (path: string) => string;
}>();

const getPortraitUrl = (charId: string, pic: string) => {
    if (!pic) return '';
    const cleanPic = props.resolveAssetPath(pic).split('/').pop();
    return `/character/${charId}/portrait/${cleanPic}`;
};
</script>

<template>
    <div class="character-container">
        <TransitionGroup name="portrait-fade">
            <div v-for="charId in characters" :key="charId" class="char-wrap">
                <img :src="getPortraitUrl(charId, look[charId])" class="char-portrait" />
            </div>
        </TransitionGroup>
    </div>
</template>

<style scoped>
.portrait-fade-enter-active { transition: all 0.5s cubic-bezier(0.18, 0.89, 0.32, 1.28); }
.portrait-fade-enter-from { opacity: 0; transform: translateY(20px) scale(0.95); }
.portrait-fade-leave-active { transition: all 0.3s ease-in; position: absolute; }
.portrait-fade-leave-to { opacity: 0; transform: scale(0.9); }
</style>
