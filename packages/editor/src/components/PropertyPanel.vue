<script setup lang="ts">
import { ref, computed, watch, reactive } from 'vue';
import ActionListEditor from './ActionListEditor.vue';
import CharacterSelector from './CharacterSelector.vue';
import PortraitSelector from './PortraitSelector.vue';
import ChoiceListEditor from './ChoiceListEditor.vue';
import SceneSelector from './SceneSelector.vue';


const props = defineProps<{
    node: any;
    profile: any;
    profileId: string;
    characterIds: string[];
    portraitHandles: Map<string, Map<string, any>>;
    sceneHandles: Map<string, any>;
    characterProfiles: Map<string, any>;
    getImageUrl: (handle: any) => Promise<string>;
    onSave?: () => void;
    allNodeIds?: string[];
}>();

const emit = defineEmits(['update:modelValue']);

const constellation = computed(() => {
    if (!props.profile?.birthDate) return '未设置';
    const parts = (props.profile.birthDate as string).split('-');
    if (parts.length < 2) return '未设置';
    const [m, d] = parts.map(Number);
    return getConstellation(m, d);
});

function getConstellation(month: number, day: number): string {
    const constellations = [
        { name: "摩羯座", m: 1, d: 20 },
        { name: "水瓶座", m: 2, d: 19 },
        { name: "双鱼座", m: 3, d: 21 },
        { name: "白羊座", m: 4, d: 20 },
        { name: "金牛座", m: 5, d: 21 },
        { name: "双子座", m: 6, d: 22 },
        { name: "巨蟹座", m: 7, d: 23 },
        { name: "狮子座", m: 8, d: 23 },
        { name: "处女座", m: 9, d: 23 },
        { name: "天秤座", m: 10, d: 24 },
        { name: "天蝎座", m: 11, d: 23 },
        { name: "射手座", m: 12, d: 22 },
        { name: "摩羯座", m: 13, d: 20 }
    ];
    const res = constellations.find(c => (month < c.m) || (month === c.m && day < c.d));
    return res ? res.name : "摩羯座";
}

function handleDataChange() {
    if (props.onSave) props.onSave();
}

// Sync helper for birthdate
const tempBirthDate = ref(props.profile?.birthDate || "01-01");
function syncBirthDate(val: string) {
    if (!props.profile) return;
    props.profile.birthDate = val;
    handleDataChange();
}

// Asset Preview Cache
const portraitUrls = reactive(new Map<string, string>());
const sceneUrls = reactive(new Map<string, string>());

async function preloadPortraits(charId: string) {
    const pMap = props.portraitHandles.get(charId);
    if (!pMap) return;
    for (const [key, handle] of pMap.entries()) {
        const cacheKey = `${charId}_${key}`;
        if (!portraitUrls.has(cacheKey)) {
            portraitUrls.set(cacheKey, await props.getImageUrl(handle));
        }
    }
}

async function preloadScenes() {
    if (!props.sceneHandles) return;
    for (const [key, handle] of props.sceneHandles.entries()) {
        if (!sceneUrls.has(key)) {
            sceneUrls.set(key, await props.getImageUrl(handle));
        }
    }
}

watch(() => props.sceneHandles, () => preloadScenes(), { immediate: true });

function addDisplayItem() {
    if (!props.node.properties.display) props.node.properties.display = [];
    props.node.properties.display.push({
        screen: { pic: "", text: "" },
        dialog: { char: props.characterIds[0] || "", portrait: "", text: "请输入剧情文本" },
        choice: [],
        transition: "fade",
        pre: [],
        post: []
    });
    handleDataChange();
}

function removeDisplayItem(idx: number) {
    props.node.properties.display.splice(idx, 1);
    handleDataChange();
}

function addFavor() {
    if (!props.profile.favor) props.profile.favor = {};
    const target = props.characterIds.find(id => id !== props.profileId && !props.profile.favor.hasOwnProperty(id)) || 'other';
    props.profile.favor = { ...props.profile.favor, [target]: 0 };
    handleDataChange();
}

function removeFavor(targetId: string) {
    delete props.profile.favor[targetId];
    handleDataChange();
}

function addInfo() {
    if (!props.profile.info) props.profile.info = [];
    props.profile.info.push({ text: "新公开传记条目...", lock: true, unlockRequirement: [] });
    handleDataChange();
}

function removeInfo(idx: number) {
    props.profile.info.splice(idx, 1);
    handleDataChange();
}

function updateFavorTarget(oldId: string, newId: string) {
    if (newId === oldId) return;
    const val = props.profile.favor[oldId];
    const newFavor = { ...props.profile.favor };
    delete newFavor[oldId];
    newFavor[newId] = val;
    props.profile.favor = newFavor;
    handleDataChange();
}

const activePortraitUrl = ref('');
watch(() => props.profileId, async (newId) => {
    if (!newId) {
        activePortraitUrl.value = '';
        return;
    }
    const pMap = props.portraitHandles.get(newId);
    if (pMap) {
        const target = pMap.get('normal') || Array.from(pMap.values())[0];
        activePortraitUrl.value = target ? await props.getImageUrl(target) : '';
    } else {
        activePortraitUrl.value = '';
    }
}, { immediate: true });
</script>

<template>
    <div class="vue-property-editor" @input="handleDataChange" @change="handleDataChange">
        <!-- Node Context -->
        <div v-if="node" class="node-editor-content">
            <h3 class="node-title">剧情节点: {{ node.properties.id }}</h3>
            
            <div class="prop-group">
                <div class="label-row">节点 ID</div>
                <el-input v-model="node.properties.id" placeholder="Node ID" />
            </div>

            <div class="prop-group-row">
                 <div class="check-row">
                    <el-checkbox v-model="node.properties.repeatable" label="可重复触发" />
                </div>
                <div class="prop-group">
                    <div class="label-row">优先级</div>
                    <el-input-number v-model="node.properties.priority" :min="0" :controls="false" style="width: 100%;" />
                </div>
            </div>

            <div class="display-items">
                <el-divider content-position="left" class="custom-divider">分镜序列 (STORY FRAMES)</el-divider>
                
                <div v-for="(item, idx) in node.properties.display" :key="idx" class="display-item-card">
                    <div class="item-header">
                        <span class="idx-label">Frame #{{ Number(idx) + 1 }}</span>
                        <el-button size="small" circle icon="Close" @click="removeDisplayItem(Number(idx))" />
                    </div>
                    
                    <div class="sub-group">
                        <div class="label-row">立绘/表情</div>
                        <div class="custom-select-wrapper">
                            <CharacterSelector 
                                v-model="item.dialog.char"
                                :character-ids="characterIds"
                                :character-profiles="characterProfiles"
                                :portrait-handles="portraitHandles"
                                :get-image-url="getImageUrl"
                                @change="preloadPortraits(item.dialog.char)"
                            />
                            <PortraitSelector 
                                v-model="item.dialog.portrait"
                                :char-id="item.dialog.char"
                                :portrait-urls="portraitUrls"
                                :portrait-handles="portraitHandles"
                                placeholder="表情立绘"
                                @visible-change="(v: boolean) => v && preloadPortraits(item.dialog.char)"
                            />
                        </div>
                    </div>

                    <div class="prop-group" style="margin-top: 12px;">
                        <div class="label-row">对话文本</div>
                        <el-input v-model="item.dialog.text" type="textarea" :rows="3" placeholder="请输入剧情文本" />
                    </div>

                    <div class="prop-group-row" style="margin-top: 8px;">
                        <div class="prop-group">
                            <div class="label-row">背景图片 & 悬浮文本</div>
                            <SceneSelector 
                                v-model="item.screen.pic" 
                                :scene-urls="sceneUrls"
                                :scene-handles="sceneHandles"
                                placeholder="选择背景图..."
                                style="margin-bottom: 4px;"
                                @update:model-value="handleDataChange"
                            />
                            <el-input v-model="item.screen.text" placeholder="场景右侧悬浮标语..." @change="handleDataChange" />
                        </div>
                        <div class="prop-group">
                            <div class="label-row">过场效果</div>
                            <el-select v-model="item.transition" placeholder="效果">
                                <el-option label="渐变 (Fade)" value="fade" />
                                <el-option label="闪烁 (Flash)" value="flash" />
                                <el-option label="切入 (None)" value="" />
                            </el-select>
                        </div>
                    </div>

                    <div class="frame-logic-group">
                        <div class="tiny-title">分镜互动选项 (CHOICES)</div>
                        <ChoiceListEditor 
                            v-model="item.choice" 
                            :node-ids="allNodeIds || []"
                            :character-ids="characterIds"
                            :character-profiles="characterProfiles"
                            :portrait-handles="portraitHandles"
                            :get-image-url="getImageUrl"
                        />
                    </div>

                    <div class="frame-logic-group">
                         <ActionListEditor title="进入分镜前 (PRE)" v-model="item.pre" :allowed-modules="['Character', 'Engine']" :character-ids="characterIds" :character-profiles="characterProfiles" :portrait-handles="portraitHandles" :get-image-url="getImageUrl" />
                         <ActionListEditor title="离开分镜后 (POST)" v-model="item.post" :allowed-modules="['Character', 'Engine']" :character-ids="characterIds" :character-profiles="characterProfiles" :portrait-handles="portraitHandles" :get-image-url="getImageUrl" />
                    </div>
                </div>
                <el-button class="btn-add-frame" @click="addDisplayItem" icon="Plus" style="width: 100%; margin-top: 5px;">新增分镜</el-button>
            </div>

            <div class="logic-sections">
                <el-divider content-position="left" class="custom-divider">流程控制 (FLOW CONTROL)</el-divider>
                <div class="action-grid-vertical">
                    <ActionListEditor title="触发条件 (TRIGGERS)" v-model="node.properties.triggers" :allowed-modules="['Requirement']" :character-ids="characterIds" :character-profiles="characterProfiles" :portrait-handles="portraitHandles" :get-image-url="getImageUrl" />
                    <ActionListEditor title="激活时动作 (ON MOUNT)" v-model="node.properties.mount" :allowed-modules="['Character', 'Engine']" :character-ids="characterIds" :character-profiles="characterProfiles" :portrait-handles="portraitHandles" :get-image-url="getImageUrl" />
                    <ActionListEditor title="销毁时动作 (ON UNMOUNT)" v-model="node.properties.unMount" :allowed-modules="['Character', 'Engine']" :character-ids="characterIds" :character-profiles="characterProfiles" :portrait-handles="portraitHandles" :get-image-url="getImageUrl" />
                </div>
            </div>
            
            <div class="prop-group" style="margin-top: 20px;">
                <div class="label-row">所属目录</div>
                <el-input v-model="node.properties.folder" />
            </div>
        </div>

        <!-- Profile Context -->
        <div v-else-if="profile" class="profile-editor-content" :key="profileId">
            <div class="profile-header-visual">
                <div class="portrait-main">
                    <img v-if="activePortraitUrl" :src="activePortraitUrl" alt="portrait" />
                    <div v-else class="portrait-placeholder">?</div>
                </div>
                <div class="header-text">
                    <h3 class="node-title">{{ profileId }} 角色全档案</h3>
                    <p class="profile-summary">核心设定: {{ profile.name || profileId }}</p>
                </div>
            </div>
            
            <div class="prop-group">
                <div class="label-row">核心 ID (Immutable)</div>
                <el-input :value="profileId" disabled />
            </div>

            <div class="prop-group-row" style="margin: 12px 0;">
                <div class="prop-group">
                    <div class="label-row">显示姓名</div>
                    <el-input v-model="profile.name" />
                </div>
                <div class="check-row">
                    <el-checkbox v-model="profile.isProtagonist" label="主角地位" />
                </div>
            </div>

            <div class="stats-grid">
                <div class="prop-group"><div class="label-row">年龄</div><el-input-number v-model="profile.age" :controls="false" style="width: 100%;" /></div>
                <div class="prop-group"><div class="label-row">身高</div><el-input-number v-model="profile.height" :controls="false" style="width: 100%;" /></div>
                <div class="prop-group"><div class="label-row">体重</div><el-input-number v-model="profile.weight" :controls="false" style="width: 100%;" /></div>
                <div class="prop-group"><div class="label-row">血型</div><el-input v-model="profile.bloodType" /></div>
            </div>

            <div class="prop-group-row" style="margin-top: 12px;">
                <div class="prop-group">
                    <div class="label-row">生日</div>
                    <el-date-picker v-model="tempBirthDate" type="date" format="MM-DD" value-format="MM-DD" style="width: 100%;" @change="syncBirthDate" />
                </div>
                <div class="prop-group">
                    <div class="label-row">星座</div>
                    <el-input :value="constellation" disabled />
                </div>
            </div>

            <el-divider content-position="left" class="custom-divider">角色关系 (FAVOR MAP)</el-divider>
            <div class="favor-section">
                <div v-for="(_fval, tid) in profile.favor" :key="tid" class="favor-row">
                    <CharacterSelector 
                        class="favor-target-sel"
                        :model-value="String(tid)" 
                        @update:model-value="updateFavorTarget(String(tid), $event)"
                        :character-ids="characterIds"
                        :character-profiles="characterProfiles"
                        :portrait-handles="portraitHandles"
                        :get-image-url="getImageUrl"
                    />
                    <el-input-number v-model="profile.favor[tid]" :min="0" :controls="false" class="favor-input" />
                    <el-button size="small" circle icon="Delete" @click="removeFavor(String(tid))" type="danger" plain />
                </div>
                <el-button size="small" @click="addFavor" icon="Plus" type="primary" plain style="width: 100%; margin-top: 8px;">添加角色关系</el-button>
            </div>

            <el-divider content-position="left" class="custom-divider">传记情报 (BIOGRAPHY)</el-divider>
            <div class="info-section">
                <div v-for="(fact, idx) in profile.info" :key="idx" class="info-card">
                    <div class="card-header">
                        <el-checkbox v-model="fact.lock" label="默认锁定" />
                        <el-button size="small" circle icon="Delete" @click="removeInfo(Number(idx))" type="danger" plain />
                    </div>
                    <el-input v-model="fact.text" type="textarea" :rows="2" placeholder="输入传记内容..." style="margin-bottom: 8px;" />
                    <ActionListEditor 
                        title="解锁条件 (UNLOCK REQUIREMENTS)" 
                        v-model="fact.unlockRequirement" 
                        :character-ids="characterIds"
                        :character-profiles="characterProfiles"
                        :portrait-handles="portraitHandles"
                        :get-image-url="getImageUrl"
                    />
                </div>
                <el-button size="small" @click="addInfo" icon="Plus" type="primary" plain style="width: 100%; margin-top: 8px;">新增传记条目</el-button>
            </div>
        </div>

        <div v-else class="empty-state">
            请在左侧选择一个节点或角色进行编辑
        </div>
    </div>
</template>

<style scoped>
.vue-property-editor {
    padding: 20px;
    color: var(--text-main);
    font-family: 'Inter', sans-serif;
    height: 100%;
    overflow-y: auto;
}

.node-title {
    font-size: 1.25rem;
    font-weight: 900;
    margin-bottom: 30px;
    color: var(--accent-color);
    border-left: 4px solid var(--accent-color);
    padding-left: 16px;
    letter-spacing: -0.5px;
}

.custom-divider {
    margin: 32px 0 20px 0;
}

:deep(.el-divider__text) {
    background-color: transparent !important;
    color: var(--text-dim) !important;
    font-size: 0.65rem !important;
    font-weight: 900 !important;
    letter-spacing: 1.5px;
}

:deep(.el-divider--horizontal) {
    border-top: 1px solid var(--border-color) !important;
}

.prop-group { margin-bottom: 12px; }
.label-row {
    font-size: 0.65rem;
    color: var(--text-dim);
    margin-bottom: 6px;
    text-transform: uppercase;
    font-weight: 800;
    letter-spacing: 0.5px;
}

.prop-group-row {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 16px;
}

.stats-grid {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 16px;
}

.check-row {
    display: flex;
    align-items: center;
    height: 100%;
}

.display-item-card, .info-card {
    background: var(--card-bg);
    border: 1px solid var(--border-color);
    border-radius: var(--radius-md);
    padding: 16px;
    margin-bottom: 16px;
    box-shadow: var(--shadow-sm);
    transition: all 0.2s;
}

.display-item-card:hover {
    border-color: var(--border-hover);
    box-shadow: var(--shadow-md);
}

.item-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 12px;
}

.idx-label { font-weight: 950; color: #f1c40f; font-size: 0.85rem; letter-spacing: 1px; }

.custom-select-wrapper {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 12px;
    align-items: stretch;
}

.custom-select-wrapper > * {
    width: 100%;
}

.frame-logic-group {
    margin-top: 16px;
    padding-top: 16px;
    border-top: 1px solid var(--border-color);
}

.tiny-title {
    font-size: 0.6rem;
    color: var(--text-dim);
    margin-bottom: 10px;
    font-weight: 900;
    text-transform: uppercase;
    letter-spacing: 1px;
}

.favor-row {
    display: flex;
    gap: 12px;
    margin-bottom: 12px;
    align-items: center;
}

.favor-target-sel { flex: 1; min-width: 0; }
.favor-input { width: 100px; }

.empty-state {
    display: flex;
    height: 100%;
    align-items: center;
    justify-content: center;
    color: var(--text-dim);
    font-style: italic;
    font-size: 0.9rem;
    opacity: 0.5;
}

/* Profile Visuals */
.profile-header-visual {
    display: flex;
    align-items: center;
    gap: 20px;
    margin-bottom: 30px;
    background: linear-gradient(135deg, rgba(52, 152, 219, 0.15) 0%, transparent 100%);
    padding: 20px;
    border-radius: var(--radius-lg);
    border: 1px solid rgba(255,255,255,0.05);
    position: relative;
    overflow: hidden;
}

.profile-header-visual::before {
    content: "";
    position: absolute;
    top: 0;
    right: 0;
    width: 100px;
    height: 100px;
    background: radial-gradient(circle at center, rgba(52, 152, 219, 0.1), transparent 70%);
    pointer-events: none;
}

.portrait-main {
    width: 90px;
    height: 110px;
    flex-shrink: 0;
    position: relative;
    z-index: 10;
}

.portrait-main img {
    height: 140%;
    width: auto;
    object-fit: contain;
    position: absolute;
    bottom: -15px;
    left: 50%;
    transform: translateX(-50%);
    filter: drop-shadow(0 15px 30px rgba(0,0,0,0.8));
}

.portrait-placeholder {
    width: 100%;
    height: 100%;
    background: #000;
    border-radius: var(--radius-md);
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 2.5rem;
    color: #222;
    border: 1px solid var(--border-color);
}

.header-text { flex: 1; }
.header-text .node-title { margin-bottom: 4px; border: none; padding-left: 0; }
.profile-summary { font-size: 0.75rem; color: var(--text-dim); margin: 0; font-weight: 500; }

.portrait-opt-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
    width: 100%;
}
.opt-preview-mini {
    width: 28px;
    height: 28px;
    overflow: hidden;
    border-radius: var(--radius-sm);
    border: 1px solid var(--border-color);
}
.opt-preview-mini img {
    width: 100%;
    height: 100%;
    object-fit: cover;
}

:deep(.el-select) {
    width: 100%;
}
</style>
