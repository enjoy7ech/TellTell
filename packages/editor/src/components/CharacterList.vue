<script setup lang="ts">
const props = defineProps<{
    characterIds: string[];
    characterProfiles: Map<string, any>;
    portraitUrls: Map<string, string>;
}>();

const emit = defineEmits(['edit-profile']);

const getThumb = (charId: string) => {
    for (const [key, url] of props.portraitUrls.entries()) {
        if (key.startsWith(`${charId}/`)) return url;
    }
    return '';
};
</script>

<template>
    <div class="char-meta-list">
        <div 
            v-for="id in characterIds" 
            :key="id" 
            class="char-meta-item"
            @click="$emit('edit-profile', id)"
        >
            <div class="char-thumb">
                 <img v-if="getThumb(id)" :src="getThumb(id)" />
                 <span v-else>?</span>
            </div>
            <div class="char-info">
                <span class="char-meta-id">{{ id }}</span>
                <div class="char-name-display">{{ characterProfiles.get(id)?.name || id }}</div>
            </div>
            <div class="edit-profile-badge">档案</div>
        </div>
        
        <div v-if="characterIds.length === 0" class="empty-state">
            未发现角色资源
        </div>
    </div>
</template>

<style scoped>
.char-meta-list {
    padding: 12px;
    display: flex;
    flex-direction: column;
    gap: 8px;
    overflow-y: auto;
    flex: 1;
}

.char-meta-item {
    background: #ffffff;
    border: 1px solid #e2e8f0;
    border-radius: 8px;
    padding: 10px 14px;
    display: flex;
    align-items: center;
    gap: 12px;
    transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
    cursor: pointer;
    position: relative;
    box-shadow: 0 1px 2px rgba(0,0,0,0.02);
}

.char-meta-item:hover {
    background: #f8fafc;
    border-color: #cbd5e1;
    transform: translateX(4px);
    box-shadow: 0 4px 12px rgba(0,0,0,0.05);
}

.char-thumb {
    width: 40px;
    background: #f1f5f9;
    border-radius: 6px;
    overflow: hidden;
    flex-shrink: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    border: 1px solid #e2e8f0;
}

.char-thumb img {
    width: 100%;
    height: 100%;
    object-fit: cover;
}

.char-thumb span { font-size: 1rem; color: #94a3b8; font-weight: 800; }

.char-info {
    display: flex;
    flex-direction: column;
    overflow: hidden;
}

.char-meta-id {
    font-size: 0.65rem;
    color: #3b82f6;
    font-weight: 800;
    font-family: 'JetBrains Mono', monospace;
    opacity: 0.8;
}

.char-name-display {
    font-size: 0.9rem;
    font-weight: 800;
    color: #1e293b; /* Pure contrast blackish */
    margin-top: 1px;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
}

.edit-profile-badge {
    margin-left: auto;
    font-size: 0.6rem;
    color: #94a3b8;
    background: #f1f5f9;
    padding: 3px 8px;
    border-radius: 12px;
    font-weight: 900;
    text-transform: uppercase;
}

.char-meta-item:hover .edit-profile-badge {
    color: #ffffff;
    background: #3b82f6;
}

.empty-state {
    text-align: center;
    color: #94a3b8;
    font-size: 0.75rem;
    margin-top: 30px;
    font-weight: 600;
}
</style>
