<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue';

const props = defineProps<{
    characterIds: string[];
    characterProfiles: Map<string, any>;
    portraitHandles: Map<string, Map<string, any>>;
    getImageUrl: (handle: any) => Promise<string>;
}>();

const emit = defineEmits(['close']);

const portraits = ref<Map<string, string>>(new Map());

// Layout state
const nodes = ref<any[]>([]);
const links = ref<any[]>([]);

async function loadPortraits() {
    for (const [id, handleMap] of props.portraitHandles) {
        const normal = handleMap.get('normal') || Array.from(handleMap.values())[0];
        if (normal) {
            const url = await props.getImageUrl(normal);
            portraits.value.set(id, url);
        }
    }
}

function initGraph() {
    const width = window.innerWidth * 0.8;
    const height = window.innerHeight * 0.8;
    const centerX = width / 2;
    const centerY = height / 2;
    const radius = Math.min(width, height) * 0.35;

    // Simple Radial Layout
    const tempNodes = props.characterIds.map((id, i) => {
        const angle = (i / props.characterIds.length) * Math.PI * 2;
        return {
            id,
            x: centerX + Math.cos(angle) * radius,
            y: centerY + Math.sin(angle) * radius,
            name: props.characterProfiles.get(id)?.name || id
        };
    });

    const tempLinks: any[] = [];
    props.characterIds.forEach(sourceId => {
        const profile = props.characterProfiles.get(sourceId);
        if (profile && profile.favor) {
            Object.entries(profile.favor).forEach(([targetId, value]) => {
                if (typeof value === 'number' && value !== 0) {
                    tempLinks.push({
                        source: sourceId,
                        target: targetId,
                        value: value
                    });
                }
            });
        }
    });

    nodes.value = tempNodes;
    links.value = tempLinks;
}

onMounted(async () => {
    await loadPortraits();
    initGraph();
    window.addEventListener('resize', initGraph);
});

onUnmounted(() => {
    window.removeEventListener('resize', initGraph);
});

function getNodePos(id: string) {
    const node = nodes.value.find(n => n.id === id);
    return node ? { x: node.x, y: node.y } : { x: 0, y: 0 };
}

// Calculate path for curved links with arrows
function getLinkPath(link: any) {
    const s = getNodePos(link.source);
    const t = getNodePos(link.target);
    
    // Offset slightly for bi-directional lines
    const dx = t.x - s.x;
    const dy = t.y - s.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist === 0) return '';

    const nx = dy / dist;
    const ny = -dx / dist;
    const offset = 10;

    const x1 = s.x + nx * offset;
    const y1 = s.y + ny * offset;
    const x2 = t.x + nx * offset;
    const y2 = t.y + ny * offset;

    return `M ${x1} ${y1} L ${x2} ${y2}`;
}

</script>

<template>
    <div class="relationship-modal" @click.self="$emit('close')">
        <div class="relationship-container">
            <div class="header">
                <h2>人物关系网 (Social Graph)</h2>
                <button class="btn-close" @click="$emit('close')">×</button>
            </div>
            
            <svg class="graph-svg" :width="'100%'" :height="'100%'">
                <defs>
                    <marker id="arrowhead" markerWidth="10" markerHeight="7" refX="25" refY="3.5" orient="auto">
                        <polygon points="0 0, 10 3.5, 0 7" fill="#3498db" />
                    </marker>
                    <marker id="arrowhead-neg" markerWidth="10" markerHeight="7" refX="25" refY="3.5" orient="auto">
                        <polygon points="0 0, 10 3.5, 0 7" fill="#e74c3c" />
                    </marker>
                </defs>

                <!-- Links -->
                <path v-for="(link, i) in links" :key="i"
                    :d="getLinkPath(link)"
                    :stroke="link.value > 0 ? 'rgba(52, 152, 219, 0.4)' : 'rgba(231, 76, 60, 0.4)'"
                    :stroke-width="Math.abs(link.value) / 10 + 1"
                    fill="none"
                    marker-end="url(#arrowhead)"
                />

                <!-- Link Labels (Values) -->
                <text v-for="(link, i) in links" :key="'val-'+i"
                    :x="(getNodePos(link.source).x + getNodePos(link.target).x) / 2 + (getNodePos(link.target).y - getNodePos(link.source).y) / 10"
                    :y="(getNodePos(link.source).y + getNodePos(link.target).y) / 2 - (getNodePos(link.target).x - getNodePos(link.source).x) / 10"
                    text-anchor="middle"
                    :fill="link.value > 0 ? '#3498db' : '#e74c3c'"
                    font-size="10"
                    font-weight="bold"
                >
                    {{ link.value > 0 ? '+' : '' }}{{ link.value }}
                </text>

                <!-- Nodes -->
                <g v-for="node in nodes" :key="node.id" :transform="`translate(${node.x}, ${node.y})`" class="node">
                    <circle r="32" fill="#222" stroke="#444" stroke-width="2" />
                    <clipPath :id="'clip-'+node.id">
                        <circle r="30" />
                    </clipPath>
                    <image v-if="portraits.get(node.id)" 
                        :href="portraits.get(node.id)" 
                        x="-30" y="-30" width="60" height="60" 
                        :clip-path="'url(#clip-'+node.id+')'"
                        preserveAspectRatio="xMidYMid slice"
                    />
                    <text y="45" text-anchor="middle" fill="#fff" font-size="12" font-weight="bold">{{ node.name }}</text>
                    <text y="58" text-anchor="middle" fill="#666" font-size="9">{{ node.id }}</text>
                </g>
            </svg>

            <div class="legend">
                <div class="legend-item"><span class="line positive"></span> 正向好感</div>
                <div class="legend-item"><span class="line negative"></span> 负向好感</div>
                <div class="hint">按 ESC 或点击空白处关闭</div>
            </div>
        </div>
    </div>
</template>

<style scoped>
.relationship-modal {
    position: fixed;
    top: 0;
    left: 0;
    width: 100vw;
    height: 100vh;
    background: rgba(0,0,0,0.85);
    backdrop-filter: blur(10px);
    z-index: 2000;
    display: flex;
    align-items: center;
    justify-content: center;
    animation: fadeIn 0.3s ease-out;
}

.relationship-container {
    width: 90vw;
    height: 90vh;
    background: #151515;
    border: 1px solid #333;
    border-radius: 20px;
    position: relative;
    overflow: hidden;
    display: flex;
    flex-direction: column;
}

.header {
    padding: 20px 30px;
    display: flex;
    justify-content: space-between;
    align-items: center;
    background: rgba(255,255,255,0.02);
    border-bottom: 1px solid #222;
}

.header h2 {
    margin: 0;
    font-size: 1.2rem;
    color: #3498db;
    letter-spacing: 1px;
}

.btn-close {
    background: none;
    border: none;
    color: #666;
    font-size: 2rem;
    cursor: pointer;
    line-height: 1;
}
.btn-close:hover { color: #fff; }

.graph-svg {
    flex: 1;
    background: radial-gradient(circle at center, #1a1a1a 0%, #151515 100%);
}

.node circle {
    transition: all 0.3s;
}
.node:hover circle {
    stroke: #3498db;
    stroke-width: 4;
}

.legend {
    position: absolute;
    bottom: 20px;
    left: 20px;
    background: rgba(0,0,0,0.5);
    padding: 12px 20px;
    border-radius: 10px;
    border: 1px solid #333;
    display: flex;
    gap: 20px;
    align-items: center;
}

.legend-item {
    font-size: 0.8rem;
    color: #888;
    display: flex;
    align-items: center;
    gap: 8px;
}

.line {
    width: 30px;
    height: 2px;
    border-radius: 1px;
}
.line.positive { background: #3498db; }
.line.negative { background: #e74c3c; }

.hint {
    margin-left: 20px;
    font-size: 0.75rem;
    color: #444;
}

@keyframes fadeIn {
    from { opacity: 0; transform: scale(0.98); }
    to { opacity: 1; transform: scale(1); }
}
</style>
