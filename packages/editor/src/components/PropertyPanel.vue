<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import ActionListEditor from './ActionListEditor.vue';
import FrameEditor from './FrameEditor.vue';
import { Connection, ArrowRight, ArrowDown, Plus, Delete, Close, Phone, Calendar } from '@element-plus/icons-vue';

const props = defineProps<{
    node: any;
    profile: any;
    profileId: string;
    characterIds: string[];
    portraitHandles: Map<string, Map<string, any>>;
    portraitUrls: Map<string, string>;
    sceneHandles: Map<string, any>;
    sceneUrls: Map<string, string>;
    characterProfiles: Map<string, any>;
    onSave?: () => void;
    allNodeIds?: string[];
    autoExpandIndex?: number;
}>();

const expandedFrames = ref<Set<number>>(new Set());

// Respond to canvas click-through -> naturally expand story frame
watch(() => props.node, (newNode) => {
    expandedFrames.value.clear();
    if (newNode && props.autoExpandIndex !== undefined && props.autoExpandIndex >= 0) {
        expandedFrames.value.add(props.autoExpandIndex);
    }
}, { immediate: true });

watch(() => props.autoExpandIndex, (newIdx) => {
    if (props.node && newIdx !== undefined && newIdx >= 0) {
        expandedFrames.value.add(newIdx);
    }
});

const constellation = computed(() => {
    if (!props.profile?.birthDate) return '未设置';
    const parts = (props.profile.birthDate as string).split('-');
    if (parts.length < 2) return '未设置';
    const [m, d] = parts.map(Number);
    return getConstellation(m, d);
});

watch(constellation, (newVal) => {
    if (props.profile && newVal !== props.profile.constellation) {
        props.profile.constellation = newVal;
    }
});

function getConstellation(month: number, day: number): string {
    const constellations = [
        { name: "摩羯座", m: 1, d: 20 }, { name: "水瓶座", m: 2, d: 19 },
        { name: "双鱼座", m: 3, d: 21 }, { name: "白羊座", m: 4, d: 20 },
        { name: "金牛座", m: 5, d: 21 }, { name: "双子座", m: 6, d: 22 },
        { name: "巨蟹座", m: 7, d: 23 }, { name: "狮子座", m: 8, d: 23 },
        { name: "处女座", m: 9, d: 23 }, { name: "天秤座", m: 10, d: 24 },
        { name: "天蝎座", m: 11, d: 23 }, { name: "射手座", m: 12, d: 22 },
        { name: "摩羯座", m: 13, d: 20 }
    ];
    const res = constellations.find(c => (month < c.m) || (month === c.m && day < c.d));
    return res ? res.name : "摩羯座";
}

function handleDataChange() {
    if (props.onSave) props.onSave();
}

function addDisplayItem() {
    if (!props.node.data.display) props.node.data.display = [];
    
    // Inherit from previous frame if exists
    const lastFrame = props.node.data.display.length > 0 
        ? props.node.data.display[props.node.data.display.length - 1] 
        : null;

    props.node.data.display.push({
        screen: { 
            pic: lastFrame?.screen?.pic || "", 
            text: "" 
        },
        dialog: { 
            char: lastFrame?.dialog?.char || props.characterIds[0] || "", 
            portrait: lastFrame?.dialog?.portrait || "", 
            text: "" 
        },
        choice: [],
        transition: "fade",
        pre: [],
        post: []
    });

    // Auto-expand the newly added frame
    const newIdx = props.node.data.display.length - 1;
    expandedFrames.value.add(newIdx);

    handleDataChange();
}

function removeDisplayItem(idx: number) {
    props.node.properties.display.splice(idx, 1);
    handleDataChange();
}

function addInfo() {
    if (!props.profile.info) props.profile.info = [];
    props.profile.info.push({ text: "新公开传记条目...", unlockRequirement: [] });
    handleDataChange();
}

function removeInfo(idx: number) {
    props.profile.info.splice(idx, 1);
    handleDataChange();
}

const activePortraitUrl = computed(() => {
    if (!props.profileId || !props.portraitUrls) return '';
    
    // Try to find normal portrait or first available in Map
    for (const [key, url] of props.portraitUrls.entries()) {
        if (key.startsWith(`${props.profileId}/`)) {
            // Priority for 'normal' if exists
            if (key.includes('normal')) return url;
        }
    }

    // Fallback: first available for this character
    for (const [key, url] of props.portraitUrls.entries()) {
        if (key.startsWith(`${props.profileId}/`)) return url;
    }
    return '';
});

function toggleFrameExpand(idx: number) {
    if (expandedFrames.value.has(idx)) {
        expandedFrames.value.delete(idx);
    } else {
        expandedFrames.value.add(idx);
    }
}
const isIdEmpty = computed(() => !props.node?.data.id?.trim());
const isIdConflict = computed(() => {
    if (!props.node || !props.allNodeIds) return false;
    return props.allNodeIds.filter(id => id === props.node.data.id).length > 1;
});
</script>

<template>
    <div class="vue-property-editor" @input="handleDataChange" @change="handleDataChange">
        <!-- Node Context -->
        <div v-if="node" class="node-editor-content" :key="node.id">
            <h3 class="node-title">剧情节点: {{ node.data.id || '(待命名)' }}</h3>
            
            <div class="prop-group">
                <div class="label-row" :class="{ 'error-text': isIdConflict || isIdEmpty }">
                    节点 ID 
                    <span v-if="isIdEmpty" class="error-msg">(必填)</span>
                    <span v-else-if="isIdConflict" class="error-msg">(重复 ID)</span>
                </div>
                <el-input 
                    v-model="node.data.id" 
                    placeholder="输入唯一标识 ID..." 
                    :class="{ 'error-input': isIdConflict || isIdEmpty }"
                    size="small"
                />
            </div>

            <div class="prop-group-row">
                 <div class="check-row">
                    <el-checkbox v-model="node.data.repeatable" label="可重复触发" />
                </div>
                <div class="prop-group">
                    <div class="label-row">优先级</div>
                    <el-input-number v-model="node.data.priority" :min="0" :controls="false" style="width: 100%;" size="small" />
                </div>
            </div>

            <div class="display-items">
                <el-divider content-position="left" class="custom-divider">分镜序列 (STORY FRAMES)</el-divider>
                
                <div v-for="(item, idx) in node.data.display" :key="idx" class="display-item-card" :class="{ collapsed: !expandedFrames.has(Number(idx)) }">
                    <div class="item-header" @click="toggleFrameExpand(Number(idx))">
                        <div class="header-left">
                            <el-icon class="collapse-arrow"><ArrowRight v-if="!expandedFrames.has(Number(idx))" /><ArrowDown v-else /></el-icon>
                            <span class="idx-label">Frame #{{ Number(idx) + 1 }}</span>
                            <span v-if="!expandedFrames.has(Number(idx))" class="collapsed-summary">
                                {{ item.dialog.text?.substring(0, 20) }}{{ (item.dialog.text?.length || 0) > 20 ? '...' : '' }}
                            </span>
                        </div>
                        <el-button size="small" circle :icon="Close" @click.stop="removeDisplayItem(Number(idx))" />
                    </div>
                    
                    <div v-if="expandedFrames.has(Number(idx))" class="item-body-animate">
                        <FrameEditor 
                            v-model="node.data.display[idx]"
                            :character-ids="characterIds"
                            :character-profiles="characterProfiles"
                            :portrait-handles="portraitHandles"
                            :portrait-urls="portraitUrls"
                            :scene-handles="sceneHandles"
                            :scene-urls="sceneUrls"
                            :node-ids="allNodeIds || []"
                            @change="handleDataChange"
                        />
                    </div>
                </div>
                <el-button class="btn-add-frame" @click="addDisplayItem" :icon="Plus" style="width: 100%; margin-top: 5px;">新增分镜</el-button>
            </div>

            <div class="logic-sections">
                <el-divider content-position="left" class="custom-divider">流程控制 (FLOW CONTROL)</el-divider>
                <div class="action-grid-vertical">
                    <ActionListEditor title="触发条件 (TRIGGERS)" v-model="node.data.triggers" allowed-type="judge" :character-ids="characterIds" :character-profiles="characterProfiles" :portrait-handles="portraitHandles" :portrait-urls="portraitUrls" />
                    <ActionListEditor title="激活时动作 (ON MOUNT)" v-model="node.data.mount" allowed-type="action" :character-ids="characterIds" :character-profiles="characterProfiles" :portrait-handles="portraitHandles" :portrait-urls="portraitUrls" />
                    <ActionListEditor title="销毁时动作 (ON UNMOUNT)" v-model="node.data.unMount" allowed-type="action" :character-ids="characterIds" :character-profiles="characterProfiles" :portrait-handles="portraitHandles" :portrait-urls="portraitUrls" />
                </div>
            </div>
        </div>

        <!-- Profile Editor -->
        <div v-else-if="profile" class="profile-editor-content" :key="profileId">
            <div class="profile-header-visual">
                <div class="portrait-main">
                    <img v-if="activePortraitUrl" :src="activePortraitUrl" alt="portrait" />
                    <div v-else class="portrait-placeholder">?</div>
                </div>
                <div class="header-text">
                    <h3 class="node-title">{{ profileId }} 角色全档案</h3>
                    <div class="p-status">
                         <el-tag v-if="profile.isProtagonist" type="warning" size="small">主角 / PROTAGONIST</el-tag>
                    </div>
                </div>
            </div>

            <el-divider content-position="left" class="custom-divider">身份信息</el-divider>
            <div class="prop-group">
                <div class="label-row">显示姓名</div>
                <el-input v-model="profile.name" size="small" />
            </div>
            <div class="prop-group">
                <div class="label-row"><el-icon><Phone /></el-icon> 电话号码</div>
                <el-input v-model="profile.phoneNumber" placeholder="尚未登记..." size="small" />
            </div>
            
            <el-divider content-position="left" class="custom-divider">身体素质 & 星盘</el-divider>
            <div class="stats-grid">
                <div class="prop-group">
                    <div class="label-row">身高 (cm)</div>
                    <el-input-number v-model="profile.height" :min="0" :controls="false" style="width: 100%;" size="small" />
                </div>
                <div class="prop-group">
                    <div class="label-row">体重 (kg)</div>
                    <el-input-number v-model="profile.weight" :min="0" :controls="false" style="width: 100%;" size="small" />
                </div>
                <div class="prop-group">
                    <div class="label-row">年龄</div>
                    <el-input-number v-model="profile.age" :min="0" :controls="false" style="width: 100%;" size="small" />
                </div>
                <div class="prop-group">
                    <div class="label-row">血型</div>
                    <el-select v-model="profile.bloodType" placeholder="选择..." size="small">
                        <el-option label="A" value="A" />
                        <el-option label="B" value="B" />
                        <el-option label="AB" value="AB" />
                        <el-option label="O" value="O" />
                        <el-option label="Other" value="Other" />
                    </el-select>
                </div>
            </div>

            <div class="date-row">
                 <div class="prop-group">
                    <div class="label-row"><el-icon><Calendar /></el-icon> 生日 (MM-DD)</div>
                    <el-input v-model="profile.birthDate" placeholder="01-01" size="small" />
                </div>
                <div class="prop-group">
                    <div class="label-row">对应星座</div>
                    <el-input :value="constellation" disabled size="small" />
                </div>
            </div>

            <el-divider content-position="left" class="custom-divider">传记详情 / 档案条目</el-divider>
            <div class="info-list">
                 <div v-for="(fact, idx) in profile.info" :key="idx" class="info-card">
                     <div class="card-top">
                        <span class="idx">INDEX #{{ (idx as number) + 1 }}</span>
                        <el-button size="small" link :icon="Delete" @click="removeInfo(idx as number)" />
                     </div>
                     <el-input v-model="fact.text" type="textarea" :rows="3" placeholder="填写情报文本..." size="small" />
                     
                     <div class="unlock-logic">
                        <ActionListEditor 
                            title="自动解锁条件 (REQ)" 
                            v-model="fact.unlockRequirement" 
                            allowed-type="judge"
                            :character-ids="characterIds"
                            :character-profiles="characterProfiles"
                            :portrait-handles="portraitHandles"
                            :portrait-urls="portraitUrls"
                        />
                     </div>
                 </div>
                 <el-button class="btn-add-info" @click="addInfo" :icon="Plus">新增传记条目</el-button>
            </div>
        </div>

        <div v-else class="empty-state">
            <el-icon class="empty-icon"><Connection /></el-icon>
            <p>未选择任何节点</p>
        </div>
    </div>
</template>

<style scoped>
.vue-property-editor {
    padding: 16px;
    color: var(--text-main);
    font-family: 'Inter', sans-serif;
    height: 100%;
    overflow-y: auto;
}

.empty-state {
    height: 80%;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    text-align: center;
    color: var(--text-dim);
    gap: 8px;
}

.empty-icon {
    font-size: 2.5rem;
    color: rgba(255,255,255,0.03);
    margin-bottom: 12px;
}

.node-title {
    font-size: 1rem;
    font-weight: 850;
    margin-bottom: 15px;
    border-bottom: 1px solid rgba(255,255,255,0.05);
    padding-bottom: 8px;
    letter-spacing: -0.3px;
}

.p-status { margin-left: 0; margin-top: -5px; margin-bottom: 12px; }

.profile-header-visual {
    display: flex;
    gap: 16px;
    align-items: center;
    margin-bottom: 16px;
}

.portrait-main {
    width: 60px;
    height: 100px;
    overflow: hidden;
    flex-shrink: 0;
    border-radius: 6px;
}

.portrait-main img {
    width: 100%;
    object-fit: cover;
}

.portrait-placeholder {
    width: 100%;
    height: 100%;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 1.5rem;
    color: #333;
    background: #eee;
}

.custom-divider { margin: 20px 0 12px 0; }

.stats-grid {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 12px;
    margin-bottom: 12px;
}

.date-row {
    display: grid;
    grid-template-columns: 1.5fr 1fr;
    gap: 12px;
}

.label-row {
    font-size: 0.6rem;
    color: var(--text-dim);
    margin-bottom: 4px;
    text-transform: uppercase;
    font-weight: 850;
    display: flex;
    align-items: center;
    gap: 4px;
}

.info-card {
    background: rgba(255,255,255,0.02);
    border: 1px solid var(--border-color);
    border-radius: 8px;
    padding: 12px;
    margin-bottom: 12px;
}

.card-top {
    display: flex;
    justify-content: space-between;
    margin-bottom: 8px;
}

.idx { font-size: 0.55rem; font-weight: 900; color: var(--accent-color); opacity: 0.8; }

.unlock-logic { margin-top: 8px; }

.btn-add-info { width: 100%; border-style: dashed; margin-top: 5px; height: 32px; font-size: 0.8rem; }

.display-items { margin-top: 15px; }

.display-item-card {
    background: var(--card-bg);
    border: 1px solid var(--border-color);
    border-radius: 8px;
    padding: 10px 12px;
    margin-bottom: 8px;
    box-shadow: var(--shadow-sm);
}

.display-item-card.collapsed {
    padding: 8px 12px;
}

.item-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    cursor: pointer;
}

.header-left {
    display: flex;
    align-items: center;
    gap: 6px;
    flex: 1;
}

.idx-label { font-weight: 950; color: #f1c40f; font-size: 0.75rem; }

.collapsed-summary {
    font-size: 0.65rem;
    color: var(--text-dim);
    margin-left: 8px;
    font-style: italic;
    opacity: 0.7;
}

.prop-group-row {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 12px;
    margin-bottom: 10px;
}

.check-row { display: flex; align-items: center; padding-top: 5px; }

.btn-add-frame {
    height: 32px !important;
    font-size: 0.8rem !important;
}
</style>
