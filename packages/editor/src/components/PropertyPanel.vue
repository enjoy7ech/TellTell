<script setup lang="ts">
import { ref, computed, reactive, watch } from 'vue';
import ActionListEditor from './ActionListEditor.vue';
import FrameEditor from './FrameEditor.vue';
import { Connection, ArrowRight, ArrowDown, Plus, Delete, Close, Phone, Calendar, MagicStick } from '@element-plus/icons-vue';
import { ElMessage, ElMessageBox } from 'element-plus';

const props = defineProps<{
    state: any;
    onSave?: () => void;
}>();

const expandedFrames = ref<Set<number>>(new Set());
const isSoulLoading = ref(false);
const bioLoadingStates = reactive<Record<number, boolean>>({});

// Portrait Generation Dialog
const portraitDialog = reactive({
    visible: false,
    id: '',
    prompt: '',
    refImage: null as File | null,
    refImageUrl: '',
    loading: false
});
const refFileRef = ref<any>(null);

function handleRefFileChange(e: any) {
    const file = e.target.files[0];
    if (file) {
        portraitDialog.refImage = file;
        portraitDialog.refImageUrl = URL.createObjectURL(file);
    }
}

function clearRefImage() {
    portraitDialog.refImage = null;
    portraitDialog.refImageUrl = '';
}

const portraitFormRef = ref<any>(null);
const portraitRules = {
    id: [
        { required: true, message: '请输入立绘 ID', trigger: 'blur' },
        { pattern: /^[a-zA-Z0-9_-]+$/, message: '仅支持英文、数字、下划线', trigger: 'blur' }
    ],
    prompt: [
        { required: true, message: '请输入视觉描述 (Prompt)', trigger: 'blur' }
    ]
};

async function generateSoulAI() {
    if (!props.state.geminiService) return alert("请先配置 Gemini API Key");
    isSoulLoading.value = true;
    try {
        const soul = await props.state.geminiService.generateCharacterSoul(props.state.profile.name || props.state.profileId);
        props.state.profile.soul = soul;
        handleDataChange();
    } finally { isSoulLoading.value = false; }
}

async function generateBioAI(idx: number) {
    if (!props.state.geminiService) return alert("请先配置 Gemini API Key");
    bioLoadingStates[idx] = true;
    try {
        const bio = await props.state.geminiService.generateBiography(
            props.state.profile.name || props.state.profileId,
            props.state.profile.soul || ""
        );
        props.state.profile.info[idx].text = bio;
        handleDataChange();
    } finally { bioLoadingStates[idx] = false; }
}

// Respond to canvas click-through -> naturally expand story frame
watch(() => props.state.node, (newNode) => {
    expandedFrames.value.clear();
    if (newNode && props.state.autoExpandFrameIndex !== undefined && props.state.autoExpandFrameIndex >= 0) {
        expandedFrames.value.add(props.state.autoExpandFrameIndex);
    }
}, { immediate: true });

watch(() => props.state.autoExpandFrameIndex, (newIdx) => {
    if (props.state.node && newIdx !== undefined && newIdx >= 0) {
        expandedFrames.value.add(newIdx);
    }
});

const constellation = computed(() => {
    if (!props.state.profile?.birthDate) return '未设置';
    const parts = (props.state.profile.birthDate as string).split('-');
    if (parts.length < 2) return '未设置';
    const [m, d] = parts.map(Number);
    return getConstellation(m, d);
});

watch(constellation, (newVal) => {
    if (props.state.profile && newVal !== props.state.profile.constellation) {
        props.state.profile.constellation = newVal;
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
    if (!props.state.node.data.display) props.state.node.data.display = [];
    
    // Inherit from previous frame if exists
    const lastFrame = props.state.node.data.display.length > 0 
        ? props.state.node.data.display[props.state.node.data.display.length - 1] 
        : null;

    props.state.node.data.display.push({
        screen: { 
            pic: lastFrame?.screen?.pic || "", 
            text: "" 
        },
        dialog: { 
            char: lastFrame?.dialog?.char || props.state.characterIds[0] || "", 
            portrait: lastFrame?.dialog?.portrait || "", 
            text: "" 
        },
        choice: [],
        transition: "fade",
        pre: [],
        post: []
    });

    // Auto-expand the newly added frame
    const newIdx = props.state.node.data.display.length - 1;
    expandedFrames.value.add(newIdx);

    handleDataChange();
}

function removeDisplayItem(idx: number) {
    props.state.node.data.display.splice(idx, 1);
    handleDataChange();
}

function addInfo() {
    if (!props.state.profile.info) props.state.profile.info = [];
    props.state.profile.info.push({ text: "新公开传记条目...", unlockRequirement: [] });
    handleDataChange();
}

function removeInfo(idx: number) {
    props.state.profile.info.splice(idx, 1);
    handleDataChange();
}

const activePortraitUrl = computed(() => {
    if (!props.state.profileId || !props.state.portraitUrls) return '';
    
    // Try to find normal portrait or first available in Map
    for (const [key, url] of props.state.portraitUrls.entries()) {
        if (key.startsWith(`${props.state.profileId}/`)) {
            // Priority for 'normal' if exists
            if (key.includes('normal')) return url;
        }
    }

    // Fallback: first available for this character
    for (const [key, url] of props.state.portraitUrls.entries()) {
        if (key.startsWith(`${props.state.profileId}/`)) return url;
    }
    return '';
});

const allPortraits = computed(() => {
    if (!props.state.profileId || !props.state.portraitUrls) return [];
    const charPrefix = `${props.state.profileId}/`;
    return (Array.from(props.state.portraitUrls.entries()) as [string, string][])
        .filter(([key]) => key.startsWith(charPrefix))
        .map(([key, url]) => ({
            id: key,
            name: key.replace(charPrefix, ''),
            url: url
        }));
});

function toggleFrameExpand(idx: number) {
    if (expandedFrames.value.has(idx)) {
        expandedFrames.value.delete(idx);
    } else {
        expandedFrames.value.add(idx);
    }
}
const isIdEmpty = computed(() => !props.state.node?.data.id?.trim());
const isIdConflict = computed(() => {
    if (!props.state.node || !props.state.editorService?.getAllNodeIds()) return false;
    return props.state.editorService?.getAllNodeIds().filter((id: string) => id === props.state.node.data.id).length > 1;
});

async function generateNewPortrait() {
    if (!props.state.geminiService) return ElMessage.warning("请先配置 Gemini API Key");
    
    // Element-plus Form Validation
    if (!portraitFormRef.value) return;
    try {
        await portraitFormRef.value.validate();
    } catch (e) {
        return; // Validation failed
    }
    
    portraitDialog.loading = true;
    try {
        // 1. Determine reference image: user selected > normal.webp > active portrait
        let refUrl = portraitDialog.refImageUrl;
        if (!refUrl) {
            const refPortraitKey = `${props.state.profileId}/normal.webp`;
            refUrl = props.state.portraitUrls.get(refPortraitKey) || activePortraitUrl.value;
        }

        // 2. Call Gemini Portrait Generation
        const result = await props.state.geminiService.generatePortrait(portraitDialog.prompt, refUrl);
        
        if (result.error) {
            ElMessage.error({ message: result.error, duration: 5000, showClose: true });
            return;
        }

        // 3. Browser-Native Chroma Key & Save (No local backend needed!)
        try {
            // Fetch and draw to Canvas
            const imgResponse = await fetch(result.url);
            const blob = await imgResponse.blob();
            const originalImg = await createImageBitmap(blob);
            
            // Fixed Target Size: 200px width for optimized storage
            const targetWidth = 200;
            const targetHeight = Math.floor(targetWidth * (originalImg.height / originalImg.width));

            const canvas = document.createElement('canvas');
            canvas.width = targetWidth;
            canvas.height = targetHeight;
            const ctx = canvas.getContext('2d');
            if (!ctx) throw new Error("无法初始化 Canvas 上下文");
            
            // Draw with Resizing
            ctx.drawImage(originalImg, 0, 0, targetWidth, targetHeight);
            const imageData = ctx.getImageData(0, 0, targetWidth, targetHeight);
            const data = imageData.data;
            
            // Chroma Key: Robust HSV-based Green Removal
            // We use a broader range to handle various green screen shades
            for (let i = 0; i < data.length; i += 4) {
                const r = data[i];
                const g = data[i + 1];
                const b = data[i + 2];
                
                // RGB to HSV Conversion
                const rN = r / 255, gN = g / 255, bN = b / 255;
                const max = Math.max(rN, gN, bN), min = Math.min(rN, gN, bN);
                const d = max - min;
                let h = 0;
                const s = max === 0 ? 0 : d / max;
                const v = max;

                if (max !== min) {
                    if (max === rN) h = (gN - bN) / d + (gN < bN ? 6 : 0);
                    else if (max === gN) h = (bN - rN) / d + 2;
                    else if (max === bN) h = (rN - gN) / d + 4;
                    h /= 6;
                }
                const hue = h * 360;

                // Detection: Detect Green (Hue ~120) with broad sensitivity (65-170)
                // and decent saturation/value to avoid hitting white/black/grey
                if (hue > 65 && hue < 170 && s > 0.25 && v > 0.25) {
                    data[i + 3] = 0; // Set Alpha to Transparent
                }
            }
            ctx.putImageData(imageData, 0, 0);
            
            // Convert to WebP and Save
            const processedBlob = await new Promise<Blob>((resolve) => 
                canvas.toBlob((b) => resolve(b!), 'image/webp', 0.9)
            );
            
            if (props.state.editorService) {
                await props.state.editorService.savePortraitAsset(
                    props.state.profileId, 
                    portraitDialog.id, 
                    processedBlob
                );
                
                // Rescan to show in UI
                await props.state.editorService.scanAssets(props.state.directoryHandle);
                ElMessage.success("立绘生成并完成背景透传！已成功保存。");
                portraitDialog.visible = false;
            }
        } catch (err: any) {
            console.error("Browser-side processing failed:", err);
            window.open(result.url, '_blank'); // Fallback
            ElMessage.warning(`本地存取权限受限，已在新窗口打开原图。`);
        }
    } finally {
        portraitDialog.loading = false;
    }
}

async function handleDeleteNode() {
    if (!props.state.node) return;
    try {
        await ElMessageBox.confirm('确定要删除这个节点吗？删除后不可恢复。', '警告', {
            confirmButtonText: '确定删除',
            cancelButtonText: '取消',
            type: 'warning'
        });
        props.state.editorService.deleteNode(props.state.node.id);
        ElMessage.success("节点已删除");
    } catch (e) {
        // Cancelled
    }
}



function selectRefFromGallery(url: string) {
    portraitDialog.refImageUrl = url;
    portraitDialog.refImage = null; // Clear local file if any
}
</script>

<template>
    <div class="vue-property-editor" @input="handleDataChange" @change="handleDataChange">
        <!-- Node Context -->
        <div v-if="props.state.node" class="node-editor-content" :key="props.state.node.id">
            <h3 class="node-title">剧情节点: {{ props.state.node.data.id || '(待命名)' }}</h3>
            
            <div class="prop-group">
                <div class="label-row" :class="{ 'error-text': isIdConflict || isIdEmpty }">
                    节点 ID 
                    <span v-if="isIdEmpty" class="error-msg">(必填)</span>
                    <span v-else-if="isIdConflict" class="error-msg">(重复 ID)</span>
                </div>
                <el-input 
                    v-model="props.state.node.data.id" 
                    placeholder="输入唯一标识 ID..." 
                    :class="{ 'error-input': isIdConflict || isIdEmpty }"
                    size="small"
                />
            </div>

            <div class="prop-group-row">
                 <div class="check-row">
                    <el-checkbox v-model="props.state.node.data.repeatable" label="可重复触发" />
                </div>
                <div class="prop-group">
                    <div class="label-row">优先级</div>
                    <el-input-number v-model="props.state.node.data.priority" :min="0" :controls="false" style="width: 100%;" size="small" />
                </div>
            </div>

            <!-- New Tags Section -->
            <div class="prop-group">
                <div class="label-row">节点标记 (TAGS)</div>
                <el-select
                    v-model="props.state.node.data.tags"
                    multiple
                    filterable
                    allow-create
                    default-first-option
                    placeholder="为节点设置标记，便于检索..."
                    size="small"
                    style="width: 100%;"
                >
                    <el-option
                        v-for="item in (props.state.node.data.tags || [])"
                        :key="item"
                        :label="item"
                        :value="item"
                    />
                </el-select>
            </div>

            <div class="display-items">
                <el-divider content-position="left" class="custom-divider">分镜序列 (STORY FRAMES)</el-divider>
                
                <div v-for="(item, idx) in props.state.node.data.display" :key="idx" class="display-item-card" :class="{ collapsed: !expandedFrames.has(Number(idx)) }">
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
                            v-model="props.state.node.data.display[idx]"
                            :state="props.state"
                            @change="handleDataChange"
                        />
                    </div>
                </div>
                <el-button class="btn-add-frame" @click="addDisplayItem" :icon="Plus" style="width: 100%; margin-top: 5px;">新增分镜</el-button>
            </div>

            <div class="logic-sections">
                <el-divider content-position="left" class="custom-divider">流程控制 (FLOW CONTROL)</el-divider>
                <div class="action-grid-vertical">
                    <ActionListEditor 
                        title="剧情前置条件 (Requirements)" 
                        v-model="props.state.node.data.requirement" 
                        allowed-type="judge"
                        :state="props.state"
                        @change="handleDataChange"
                    />

                    <ActionListEditor 
                        title="默认后续动作 (Fallback Post Actions)" 
                        v-model="props.state.node.data.post" 
                        allowed-type="action"
                        :state="props.state"
                        @change="handleDataChange"
                    />
                </div>
            </div>

            <div class="danger-zone">
                <el-divider content-position="left" class="custom-divider">危险区域 (DANGER ZONE)</el-divider>
                <el-button 
                    type="danger" 
                    plain 
                    size="small" 
                    :icon="Delete" 
                    @click="handleDeleteNode" 
                    style="width: 100%; border-style: dashed;"
                >
                    删除当前剧情节点
                </el-button>
            </div>
        </div>

        <!-- Profile Editor -->
        <div v-else-if="props.state.profile" class="profile-editor-content" :key="props.state.profileId">
            <div class="profile-header-visual">
                <div class="portrait-main">
                    <img v-if="activePortraitUrl" :src="activePortraitUrl" alt="portrait" />
                    <div v-else class="portrait-placeholder">?</div>
                </div>
                <div class="header-text">
                    <h3 class="node-title">{{ props.state.profileId }} 角色全档案</h3>
                    <div class="p-status">
                         <el-tag v-if="props.state.profile.isProtagonist" type="warning" size="small">主角 / PROTAGONIST</el-tag>
                    </div>
                </div>
            </div>

            <el-divider content-position="left" class="custom-divider">身份信息</el-divider>
            <div class="prop-group">
                <div class="label-row">显示姓名</div>
                <el-input v-model="props.state.profile.name" size="small" />
            </div>
            <div class="prop-group">
                <div class="label-row"><el-icon><Phone /></el-icon> 电话号码</div>
                <el-input v-model="props.state.profile.phoneNumber" placeholder="尚未登记..." size="small" />
            </div>

            <el-divider content-position="left" class="custom-divider">立绘管理 Assets</el-divider>
            <div class="portrait-actions-row">
                <div @click="portraitDialog.visible = true" class="action-btn-minimal primary-text">
                    <el-icon><Plus /></el-icon>
                    <span>AI 创作</span>
                </div>
            </div>

            <div class="portrait-list">
                <div 
                    v-for="p in allPortraits" 
                    :key="p.id" 
                    class="portrait-item"
                >
                    <div class="portrait-preview">
                        <img :src="p.url" />
                    </div>
                    <div class="portrait-name">{{ p.name }}</div>
                </div>
                <div v-if="allPortraits.length === 0" class="portrait-empty">
                    未在素材目录中找到该角色的立绘
                </div>
            </div>
            
            <el-divider content-position="left" class="custom-divider">身体素质 & 星盘</el-divider>
            <div class="stats-grid">
                <div class="prop-group">
                    <div class="label-row">身高 (cm)</div>
                    <el-input-number v-model="props.state.profile.height" :min="0" :controls="false" style="width: 100%;" size="small" />
                </div>
                <div class="prop-group">
                    <div class="label-row">体重 (kg)</div>
                    <el-input-number v-model="props.state.profile.weight" :min="0" :controls="false" style="width: 100%;" size="small" />
                </div>
                <div class="prop-group">
                    <div class="label-row">年龄</div>
                    <el-input-number v-model="props.state.profile.age" :min="0" :controls="false" style="width: 100%;" size="small" />
                </div>
                <div class="prop-group">
                    <div class="label-row">血型</div>
                    <el-select v-model="props.state.profile.bloodType" placeholder="选择..." size="small">
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
                    <el-input v-model="props.state.profile.birthDate" placeholder="01-01" size="small" />
                </div>
                <div class="prop-group">
                    <div class="label-row">对应星座</div>
                    <el-input :value="constellation" disabled size="small" />
                </div>
            </div>

            <!-- New Soul Section -->
            <el-divider content-position="left" class="custom-divider">灵魂设定 (SOUL.MD)</el-divider>
            <div class="prop-group">
                <div class="label-row">
                    核心人设与性格描写
                    <el-button 
                        v-if="props.state.geminiService"
                        link :icon="MagicStick" 
                        size="small" 
                        @click="generateSoulAI"
                        :loading="isSoulLoading"
                        style="margin-left: auto; color: #a855f7;"
                    >AI 生成</el-button>
                </div>
                <el-input 
                    v-model="props.state.profile.soul" 
                    type="textarea" 
                    :rows="6" 
                    placeholder="在这里描写角色的灵魂核心、性格缺陷、驱动力等深度内容，对应 soul.md 文件..." 
                    size="small" 
                />
            </div>

            <el-divider content-position="left" class="custom-divider">传记详情 / 档案条目</el-divider>
            <div class="info-list">
                 <div v-for="(fact, idx) in props.state.profile.info" :key="idx" class="info-card">
                     <div class="card-top">
                        <span class="idx">INDEX #{{ (idx as number) + 1 }}</span>
                        <div class="card-actions">
                            <el-button 
                                v-if="props.state.geminiService"
                                link :icon="MagicStick" 
                                size="small" 
                                @click="generateBioAI(idx as number)"
                                :loading="!!bioLoadingStates[idx as number]"
                                style="color: #a855f7;"
                            >AI 生成</el-button>
                            <el-button size="small" link :icon="Delete" @click="removeInfo(idx as number)" />
                        </div>
                     </div>
                     <el-input v-model="fact.text" type="textarea" :rows="3" placeholder="填写情报文本..." size="small" />
                     
                     <div class="unlock-logic">
                        <ActionListEditor 
                            title="自动解锁条件 (REQ)" 
                            v-model="fact.unlockRequirement" 
                            allowed-type="judge"
                            :state="props.state"
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

        <!-- Add Portrait Dialog -->
        <el-dialog 
            v-model="portraitDialog.visible" 
            title="AI 立绘生成" 
            width="400px"
            append-to-body
            class="ai-dialog"
        >
            <el-form 
                ref="portraitFormRef"
                :model="portraitDialog"
                :rules="portraitRules"
                label-position="top"
                size="small"
                @submit.prevent
            >
                <el-form-item label="立绘 ID (用于文件名)" prop="id">
                    <el-input 
                        v-model="portraitDialog.id" 
                        placeholder="e.g. happy, distressed" 
                    />
                </el-form-item>
                
                <el-form-item label="视觉描述 (PROMPT)" prop="prompt" style="margin-top: 15px;">
                    <el-input 
                        v-model="portraitDialog.prompt" 
                        type="textarea" 
                        :rows="4" 
                        placeholder="描述角色的表情、动作、服装细节..." 
                    />
                </el-form-item>

                <el-form-item label="参考图片 (REFERENCE IMAGE)">
                    <div class="ref-image-selector">
                        <div v-if="portraitDialog.refImageUrl" class="ref-preview">
                            <img :src="portraitDialog.refImageUrl" />
                            <el-button class="btn-clear-ref" circle size="small" :icon="Close" @click="clearRefImage" />
                        </div>
                        <div v-else class="ref-placeholder" @click="refFileRef?.click()">
                            <el-icon><Plus /></el-icon>
                            <span>上传本地图</span>
                        </div>
                        <input type="file" ref="refFileRef" hidden accept="image/*" @change="handleRefFileChange" />
                        
                        <div class="ref-gallery">
                            <div v-for="p in allPortraits" 
                                :key="p.url" 
                                class="gallery-item" 
                                :class="{ 'active': portraitDialog.refImageUrl === p.url }"
                                @click="selectRefFromGallery(p.url)"
                            >
                                <el-popover
                                    placement="left"
                                    trigger="hover"
                                    :width="240"
                                    popper-class="ref-popover"
                                >
                                    <template #reference>
                                        <div class="gallery-item-inner">
                                            <img :src="p.url" />
                                        </div>
                                    </template>
                                    <div class="portrait-preview-large">
                                        <div class="preview-header">{{ p.name.split('.').shift() }}</div>
                                        <div class="preview-aspect-container">
                                            <img :src="p.url" class="full-portrait" />
                                        </div>
                                    </div>
                                </el-popover>
                            </div>
                        </div>
                    </div>
                    <div class="dialog-tip" style="margin-top: 5px; font-size: 0.6rem; color: var(--text-dim);">
                        * 若未选择，将默认尝试参考 normal.webp 以保持角色一致性。
                    </div>
                </el-form-item>
            </el-form>
            <template #footer>
                <el-button size="small" @click="portraitDialog.visible = false">取消</el-button>
                <el-button 
                    size="small" 
                    type="primary" 
                    :loading="portraitDialog.loading"
                    @click="generateNewPortrait"
                >开始生成</el-button>
            </template>
        </el-dialog>
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

.label-row.error-text {
    color: #f87171 !important;
}

.error-msg {
    font-size: 0.55rem;
    color: #f87171;
    font-weight: 900;
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

.portrait-list {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(105px, 1fr));
    gap: 12px;
    margin-top: 15px;
}

.portrait-item {
    display: flex;
    flex-direction: column;
    align-items: center;
    width: 100%;
}

.portrait-preview {
    width: 100%;
    aspect-ratio: 2 / 3;
    background: #f1f5f9;
    background-image: 
        linear-gradient(45deg, #e2e8f0 25%, transparent 25%), 
        linear-gradient(-45deg, #e2e8f0 25%, transparent 25%), 
        linear-gradient(45deg, transparent 75%, #e2e8f0 75%), 
        linear-gradient(-45deg, transparent 75%, #e2e8f0 75%);
    background-size: 12px 12px;
    background-position: 0 0, 0 6px, 6px -6px, -6px 0px;
    border: 1px solid var(--border-color);
    border-radius: 8px;
    overflow: hidden;
    position: relative;
    transition: all 0.2s;
}

.portrait-preview img {
    width: 100%;
    height: 100%;
    object-fit: cover;
    object-position: top;
    display: block;
}

.portrait-item:hover .portrait-preview {
    border-color: var(--accent-color);
    transform: translateY(-2px);
    box-shadow: 0 4px 12px var(--accent-glow);
}

.portrait-name {
    margin-top: 6px;
    font-size: 0.6rem;
    color: var(--text-dim);
    font-weight: 500;
    text-transform: uppercase;
    text-align: center;
    width: 100%;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
}

.header-with-actions {
    display: flex;
    justify-content: space-between;
    align-items: center;
    width: 100%;
}

.portrait-actions-row {
    display: flex;
    gap: 8px;
    margin: -5px 0 15px 0;
    padding-left: 12px;
}

.action-btn-minimal {
    font-size: 0.65rem;
    color: var(--text-dim);
    cursor: pointer;
    display: flex;
    align-items: center;
    gap: 4px;
    padding: 2px 8px;
    border-radius: 4px;
    background: rgba(255, 255, 255, 0.05);
    transition: all 0.2s;
}

.action-btn-minimal:hover {
    color: var(--accent-color);
    background: rgba(255, 255, 255, 0.1);
}

.action-btn-minimal.primary-text {
    color: var(--accent-color);
}

.portrait-empty {
    text-align: center;
    padding: 20px;
    font-size: 0.7rem;
    color: var(--text-dim);
    font-style: italic;
}

/* Force red border for validation errors */
:deep(.el-form-item.is-error .el-input__wrapper),
:deep(.el-form-item.is-error .el-textarea__inner) {
    box-shadow: 0 0 0 1px #f87171 inset !important;
}

:deep(.el-form-item.is-error .el-form-item__label) {
    color: #f87171 !important;
}

.ref-image-selector { width: 100%; margin-top: 5px; }

.ref-preview {
    width: 60px;
    height: 90px;
    position: relative;
    border-radius: 6px;
    overflow: hidden;
    border: 1px solid var(--accent-color);
}

.ref-preview img { width: 100%; height: 100%; object-fit: cover; }

.btn-clear-ref {
    position: absolute;
    top: 2px;
    right: 2px;
    background: rgba(0,0,0,0.5) !important;
    border: none !important;
}

.ref-placeholder {
    width: 60px;
    height: 90px;
    border: 1px dashed var(--border-color);
    border-radius: 6px;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    transition: all 0.2s;
    color: var(--text-dim);
}

.ref-placeholder:hover {
    border-color: var(--accent-color);
    color: var(--text-main);
    background: rgba(255,255,255,0.02);
}

.ref-placeholder span { font-size: 0.5rem; margin-top: 4px; text-align: center; line-height: 1.2; padding: 0 4px; }

.ref-image-selector {
    display: flex;
    gap: 12px;
    align-items: flex-start;
}

.ref-gallery {
    flex: 1;
    display: flex;
    gap: 8px;
    overflow-x: auto;
    padding-bottom: 4px;
    height: 90px;
}

.gallery-item {
    aspect-ratio: 9/16;
    flex-shrink: 0;
    border-radius: 4px;
    overflow: hidden;
    border: 2px solid transparent;
    cursor: pointer;
    transition: all 0.2s;
    opacity: 0.6;
}

.gallery-item:hover { opacity: 1; border-color: rgba(255,255,255,0.2); }
.gallery-item.active { opacity: 1; border-color: var(--accent-color); }
.gallery-item img { width: 100%; height: 100%; object-fit: contain; object-position: top; }
.gallery-item-inner { width: 100%; height: 100%; }

/* Portrait Hover Preview */
.ref-popover {
    padding: 0 !important;
    border: 1px solid rgba(0,0,0,0.1) !important;
    background: #fff !important; /* LIGHT BACKGROUND NOW */
    overflow: hidden;
    border-radius: 8px !important;
    min-width: 240px !important;
}

.portrait-preview-large {
    width: 100%;
    background: #000;
}

.preview-header {
    background: #f8fafc;
    padding: 6px 12px;
    font-size: 0.65rem;
    font-weight: 800;
    color: #3b82f6; /* VIBRANT BLUE TITLE */
    text-transform: uppercase;
    text-align: center;
    border-bottom: 1px solid rgba(0,0,0,0.05);
}

.preview-aspect-container {
    width: 100%;
    aspect-ratio: 9 / 16;
    background-color: #f1f5f9;
    background-image: 
        linear-gradient(45deg, #e2e8f0 25%, transparent 25%), 
        linear-gradient(-45deg, #e2e8f0 25%, transparent 25%), 
        linear-gradient(45deg, transparent 75%, #e2e8f0 75%), 
        linear-gradient(-45deg, transparent 75%, #e2e8f0 75%);
    background-size: 16px 16px;
    background-position: 0 0, 0 8px, 8px -8px, -8px 0px;
    display: flex;
    align-items: flex-start;
    justify-content: center;
    overflow: hidden;
}

.full-portrait {
    width: 100%;
    height: 100%;
    object-fit: contain;
    object-position: top;
}
</style>
