<script setup lang="ts">
defineProps<{
    characterIds: string[];
    characterProfiles: Map<string, any>;
}>();

defineEmits(['edit-profile']);
</script>

<template>
    <div class="char-meta-list">
        <div 
            v-for="id in characterIds" 
            :key="id" 
            class="char-meta-item"
            @click="$emit('edit-profile', id)"
        >
            <div class="char-meta-row">
                <span class="char-meta-id">ID: {{ id }}</span>
            </div>
            <div class="char-name-display">{{ characterProfiles.get(id)?.name || id }}</div>
            <div class="edit-profile-badge">⚙️ 编辑档案</div>
        </div>
        
        <div v-if="characterIds.length === 0" class="empty-state">
            未发现角色资源
        </div>
    </div>
</template>

<style scoped>
.char-meta-list {
    padding: 15px;
    display: flex;
    flex-direction: column;
    gap: 12px;
    overflow-y: auto;
    flex: 1;
}

.char-meta-item {
    background: rgba(255, 255, 255, 0.03);
    border: 1px solid rgba(255, 255, 255, 0.08);
    border-radius: 10px;
    padding: 14px;
    transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
    cursor: pointer;
    position: relative;
    border-left: 4px solid transparent;
}

.char-meta-item:hover {
    background: rgba(255, 255, 255, 0.08);
    border-color: rgba(52, 152, 219, 0.2);
    border-left-color: var(--accent-color);
    transform: translateX(4px);
    box-shadow: 0 10px 20px rgba(0,0,0,0.2);
}

.char-meta-id {
    font-size: 0.65rem;
    opacity: 0.4;
    font-family: 'JetBrains Mono', monospace;
    text-transform: uppercase;
}

.char-name-display {
    font-size: 1rem;
    font-weight: 800;
    color: #fff;
    margin-top: 4px;
}

.edit-profile-badge {
    position: absolute;
    top: 14px;
    right: 14px;
    font-size: 0.65rem;
    color: #fff;
    background: #8e44ad;
    padding: 2px 8px;
    border-radius: 100px;
    opacity: 0.4;
    transition: all 0.3s;
    font-weight: bold;
}

.char-meta-item:hover .edit-profile-badge {
    opacity: 1;
}

.empty-state {
    text-align: center;
    color: #555;
    font-style: italic;
    margin-top: 40px;
}
</style>
