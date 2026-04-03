<script setup lang="ts">
import { ref, onMounted, onUnmounted, reactive } from 'vue';
import { Plus, Refresh } from '@element-plus/icons-vue';

const props = defineProps<{
    state: any;
}>();

const canvasRef = ref<HTMLCanvasElement | null>(null);
const containerRef = ref<HTMLDivElement | null>(null);

// Transform State
const offset = reactive({ x: 0, y: 0 });
const zoom = ref(1.0);
const GRID_SIZE = 32;

// Selection & Dragging State
const interaction = reactive({
    dragging: false,
    dragStart: { x: 0, y: 0 },
    panning: false,
    panStart: { x: 0, y: 0 },
    connecting: false,
    connectionStart: null as any,
    mousePos: { x: 0, y: 0 },
    draggedNode: null as any,
    selectedNode: null as any,
    hoveredNode: null as any,
    hoveredEdge: null as any, // { source, target, type: 'choice' | 'edge', index? }
    hoveredFrame: null as any, // { node, index }
    clickedTarget: null as any, // { type: 'node' | 'frame', node, frameIdx? }
    mouseDown: false,
    dragStarted: false // Track if we actually moved significantly
});

// Helper: Distance from point p to cubic bezier
function getDistToBezier(px: number, py: number, x1: number, y1: number, cp1x: number, cp1y: number, cp2x: number, cp2y: number, x2: number, y2: number) {
    let minSnap = Infinity;
    const steps = 15;
    for (let i = 0; i <= steps; i++) {
        const t = i / steps;
        const cx = Math.pow(1 - t, 3) * x1 + 3 * Math.pow(1 - t, 2) * t * cp1x + 3 * (1 - t) * Math.pow(t, 2) * cp2x + Math.pow(t, 3) * x2;
        const cy = Math.pow(1 - t, 3) * y1 + 3 * Math.pow(1 - t, 2) * t * cp1y + 3 * (1 - t) * Math.pow(t, 2) * cp2y + Math.pow(t, 3) * y2;
        const d = Math.sqrt(Math.pow(px - cx, 2) + Math.pow(py - cy, 2));
        if (d < minSnap) minSnap = d;
    }
    return minSnap;
}

// Context Menu State
const contextMenu = reactive({
    show: false,
    x: 0,
    y: 0,
    canvasPos: { x: 0, y: 0 }
});

// Canvas Rendering constants
const COLORS = {
    bg: '#f1f5f9',
    grid: '#cbd5e1',
    nodeBg: '#ffffff',
    nodeBorder: '#e2e8f0',
    nodeSelected: '#3b82f6',
    nodeText: '#475569',
    nodeLabel: '#94a3b8',
    edge: '#94a3b8',
    edgeActive: '#3b82f6',
    pin: '#ec4899',
    pinInput: '#3b82f6'
};

const NODE_WIDTH = 150;
const NODE_HEADER_HEIGHT = 30;
const FRAME_SQUARE_SIZE = 22;
const FRAME_GAP = 6;
const PADDING = 12;

/**
 * Coordinate Conversion
 */


function fromScreen(x: number, y: number) {
    return {
        x: (x - offset.x) / zoom.value,
        y: (y - offset.y) / zoom.value
    };
}

/**
 * Node Bounds Calculation
 */
function getNodeHeight(node: any) {
    const frames = node.data?.display || [];
    if (frames.length === 0) return 60;
    
    // Each row of frames? Let's assume a simple wrapping track
    const framesPerRow = 4;
    const rows = Math.ceil(frames.length / framesPerRow);
    const contentHeight = 20 + (rows * (FRAME_SQUARE_SIZE + FRAME_GAP)); // Label + Squares
    return NODE_HEADER_HEIGHT + contentHeight + PADDING * 2;
}

function isPointInNode(x: number, y: number, node: any) {
    const h = getNodeHeight(node);
    // Expand bounds slightly to catch inputs and handles
    return x >= node.position.x - 10 && x <= node.position.x + NODE_WIDTH + 10 &&
           y >= node.position.y && y <= node.position.y + h;
}

/**
 * Drawing Logic
 */
function draw() {
    const canvas = canvasRef.value;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Clear background
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = COLORS.bg;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Grid (Infinite tiling effect)
    ctx.translate(offset.x % (GRID_SIZE * zoom.value), offset.y % (GRID_SIZE * zoom.value));
    ctx.beginPath();
    ctx.strokeStyle = COLORS.grid;
    ctx.lineWidth = 1;
    ctx.globalAlpha = 0.3;
    
    for (let x = 0; x <= canvas.width; x += GRID_SIZE * zoom.value) {
        ctx.moveTo(x, -GRID_SIZE * zoom.value);
        ctx.lineTo(x, canvas.height);
    }
    for (let y = 0; y <= canvas.height; y += GRID_SIZE * zoom.value) {
        ctx.moveTo(-GRID_SIZE * zoom.value, y);
        ctx.lineTo(canvas.width, y);
    }
    ctx.stroke();
    ctx.globalAlpha = 1.0;

    // Apply View Transform for Content
    ctx.setTransform(zoom.value, 0, 0, zoom.value, offset.x, offset.y);
    const activeEdges = props.state.edges || [];

    // 1. Draw Nodes (Base Content)
    props.state.nodes.forEach((node: any) => {
        const height = getNodeHeight(node);
        const isSelected = props.state.node?.id === node.id;

        // Node Container (Premium card look)
        ctx.save();
        ctx.shadowColor = 'rgba(0,0,0,0.05)';
        ctx.shadowBlur = 10;
        ctx.shadowOffsetY = 4;
        
        ctx.beginPath();
        ctx.roundRect(node.position.x, node.position.y, NODE_WIDTH, height, 14);
        ctx.fillStyle = COLORS.nodeBg;
        ctx.fill();
        ctx.lineWidth = isSelected ? 2 : 1;
        ctx.strokeStyle = isSelected ? COLORS.nodeSelected : COLORS.nodeBorder;
        ctx.stroke();
        ctx.restore();

        // 1. Header (Title Chip)
        const headerRect = { x: node.position.x + PADDING/2, y: node.position.y + PADDING/2, w: NODE_WIDTH - PADDING, h: 24 };
        const grad = ctx.createLinearGradient(headerRect.x, headerRect.y, headerRect.x + headerRect.w, headerRect.y);
        grad.addColorStop(0, '#3b82f6');
        grad.addColorStop(1, '#60a5fa');
        
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.roundRect(headerRect.x, headerRect.y, headerRect.w, headerRect.h, 8);
        ctx.fill();

        ctx.font = 'bold 11px Inter, system-ui, sans-serif';
        ctx.fillStyle = '#ffffff';
        ctx.textAlign = 'center';
        ctx.fillText(node.data?.id || node.id, headerRect.x + headerRect.w/2, headerRect.y + 16);
        ctx.textAlign = 'left';

        // Frame Track
        const frames = node.data?.display || [];
        if (frames.length > 0) {
            ctx.font = '7px Bold sans-serif';
            ctx.fillStyle = COLORS.nodeLabel;
            ctx.fillText("FRAMES", node.position.x + PADDING, node.position.y + NODE_HEADER_HEIGHT + 14);

            frames.forEach((f: any, idx: number) => {
                const r = Math.floor(idx / 4);
                const c = idx % 4;
                const fx = node.position.x + PADDING + c * (FRAME_SQUARE_SIZE + FRAME_GAP);
                const fy = node.position.y + NODE_HEADER_HEIGHT + 20 + PADDING + r * (FRAME_SQUARE_SIZE + FRAME_GAP);
                
                const isFrameActive = props.state.node?.id === node.id && props.state.autoExpandFrameIndex === idx;
                const isFrameHovered = interaction.hoveredFrame?.node?.id === node.id && interaction.hoveredFrame?.index === idx;

                ctx.beginPath();
                ctx.roundRect(fx, fy, FRAME_SQUARE_SIZE, FRAME_SQUARE_SIZE, 6);
                ctx.fillStyle = isFrameActive ? '#e0f2fe' : (isFrameHovered ? '#f1f5f9' : '#ffffff');
                ctx.fill();
                ctx.lineWidth = (isFrameActive || isFrameHovered) ? 1.5 : 1;
                ctx.strokeStyle = (isFrameActive || isFrameHovered) ? COLORS.nodeSelected : COLORS.nodeBorder;
                ctx.stroke();

                if (f.choice?.length > 0) {
                    ctx.fillStyle = COLORS.pin;
                    const dotRadius = 1.5;
                    f.choice.forEach((_: any, dIdx: number) => {
                        const dc = dIdx % 2;
                        const dr = Math.floor(dIdx / 2);
                        ctx.beginPath();
                        ctx.arc(fx + 6 + dc*10, fy + 6 + dr*10, dotRadius, 0, Math.PI * 2);
                        ctx.fill();
                    });
                }
            });
        }

        // Logic Ports
        ctx.fillStyle = COLORS.pinInput;
        ctx.beginPath();
        ctx.roundRect(node.position.x - 6, node.position.y + height/2 - 11, 8, 22, [5, 0, 0, 5]);
        ctx.fill();
        ctx.fillStyle = COLORS.pin;
        ctx.beginPath();
        ctx.roundRect(node.position.x + NODE_WIDTH - 2, node.position.y + height/2 - 11, 8, 22, [0, 5, 5, 0]);
        ctx.fill();

        // Highlighting for connection target
        if (interaction.connecting) {
            const dist = Math.sqrt(Math.pow(interaction.mousePos.x - node.position.x, 2) + Math.pow(interaction.mousePos.y - (node.position.y + height/2), 2));
            if (dist < 40) {
                ctx.strokeStyle = COLORS.pin;
                ctx.lineWidth = 2;
                ctx.beginPath();
                ctx.arc(node.position.x - 2, node.position.y + height/2, 12, 0, Math.PI * 2);
                ctx.stroke();
            }
        }
    });

    // 2. Draw Edges (Top Layer)
    // 2.1 Draw Explicit Edges
    activeEdges.forEach((edge: any) => {
        const source = props.state.nodes.find((n: any) => n.id === edge.source);
        const target = props.state.nodes.find((n: any) => n.id === edge.target);
        if (!source || !target) return;

        const sH = getNodeHeight(source);
        const tH = getNodeHeight(target);
        const startX = source.position.x + NODE_WIDTH;
        const startY = source.position.y + sH/2;
        const endX = target.position.x;
        const endY = target.position.y + tH/2;

        const isHovered = interaction.hoveredEdge && (interaction.hoveredEdge.id === edge.id);
        ctx.beginPath();
        ctx.strokeStyle = isHovered ? COLORS.nodeSelected : (edge.style?.stroke || COLORS.edge);
        ctx.lineWidth = isHovered ? 3.0 : 1.8;
        if (edge.animated) {
            ctx.setLineDash([5, 5]);
            ctx.lineDashOffset = -(Date.now() / 30) % 10; // Negative for forward flow
        }
        
        const cp1x = startX + (endX - startX) / 2;
        const cp2x = startX + (endX - startX) / 2;
        ctx.moveTo(startX, startY);
        ctx.bezierCurveTo(cp1x, startY, cp2x, endY, endX, endY);
        ctx.stroke();
        ctx.setLineDash([]);
    });

    // 2.2 Draw Narrative Choice Edges
    props.state.nodes.forEach((n: any) => {
        const frames = n.data?.display || [];
        frames.forEach((f: any, fIdx: number) => {
            if (!f.choice) return;
            f.choice.forEach((c: any, cIdx: number) => {
                let targetId = c.target;
                if (!targetId && c.action) {
                    const jumpAction = c.action.find((a: any) => a.module === 'Engine' && a.func === 'startStoryNode');
                    if (jumpAction && jumpAction.params?.[0]) targetId = jumpAction.params[0];
                }
                if (!targetId) return;

                const targetNode = props.state.nodes.find((tn: any) => tn.id === targetId || (tn.data && tn.data.id === targetId));
                if (targetNode) {
                    const fx = n.position.x + PADDING + (fIdx % 4) * (FRAME_SQUARE_SIZE + FRAME_GAP);
                    const fy = n.position.y + NODE_HEADER_HEIGHT + 20 + PADDING + Math.floor(fIdx / 4) * (FRAME_SQUARE_SIZE + FRAME_GAP);
                    const startX = fx + FRAME_SQUARE_SIZE / 2;
                    const startY = fy + FRAME_SQUARE_SIZE / 2;
                    const th = getNodeHeight(targetNode);
                    const endX = targetNode.position.x;
                    const endY = targetNode.position.y + th / 2;

                    if (props.state.edges.some((e: any) => e.source === n.id && e.target === targetNode.id)) return;

                    const isHovered = interaction.hoveredEdge && (interaction.hoveredEdge.source === n.id && 
                                      interaction.hoveredEdge.frameIdx === fIdx && interaction.hoveredEdge.choiceIdx === cIdx);

                    ctx.beginPath();
                    ctx.strokeStyle = isHovered ? COLORS.nodeSelected : COLORS.edge;
                    ctx.lineWidth = isHovered ? 2.5 : 1.0;
                    ctx.setLineDash([2, 3]);
                    const cp1x = startX + (endX - startX) / 2;
                    const cp2x = startX + (endX - startX) / 2;
                    ctx.moveTo(startX, startY);
                    ctx.bezierCurveTo(cp1x, startY, cp2x, endY, endX, endY);
                    ctx.stroke();
                    ctx.setLineDash([]);
                }
            });
        });
    });

    // 3. Draw Connecting Line (Overlay)
    if (interaction.connecting) {
        ctx.beginPath();
        ctx.strokeStyle = COLORS.pin;
        ctx.lineWidth = 2;
        ctx.setLineDash([5, 5]);
        ctx.moveTo(interaction.connectionStart.px, interaction.connectionStart.py);
        
        const endX = interaction.mousePos.x;
        const endY = interaction.mousePos.y;
        const cp1x = interaction.connectionStart.px + (endX - interaction.connectionStart.px) / 2;
        const cp2x = interaction.connectionStart.px + (endX - interaction.connectionStart.px) / 2;
        
        ctx.bezierCurveTo(cp1x, interaction.connectionStart.py, cp2x, endY, endX, endY);
        ctx.stroke();
        ctx.setLineDash([]);
    }

    requestAnimationFrame(draw);
}

/**
 * Mouse Events
 */
function onMouseDown(e: MouseEvent) {
    const rect = canvasRef.value!.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const p = fromScreen(x, y);

    interaction.mouseDown = true;
    contextMenu.show = false;

    // 0. Double Click: Delete Hovered Edge
    if (e.detail === 2 && interaction.hoveredEdge) {
        if (interaction.hoveredEdge.type === 'edge') {
            props.state.edges = props.state.edges.filter((e: any) => e.id !== interaction.hoveredEdge.id);
        } else if (interaction.hoveredEdge.type === 'choice') {
            const n = props.state.nodes.find((node: any) => node.id === interaction.hoveredEdge.source);
            if (n && n.data?.display?.[interaction.hoveredEdge.frameIdx]?.choice?.[interaction.hoveredEdge.choiceIdx]) {
                n.data.display[interaction.hoveredEdge.frameIdx].choice[interaction.hoveredEdge.choiceIdx].target = "";
            }
        }
        if (props.state.editorService) props.state.editorService.triggerAutoSave();
        interaction.hoveredEdge = null;
        return;
    }

    // 1. Check for Handles (Ports) First - Highest Priority
    for (const n of [...props.state.nodes].reverse()) {
        const height = getNodeHeight(n);
        const outX = n.position.x + NODE_WIDTH;
        const outY = n.position.y + height/2;
        
        // Output Handle (Pink) - Hitbox centered on handle
        if (Math.abs(p.x - outX) < 20 && Math.abs(p.y - outY) < 20) {
            if (e.button === 2) {
                // Right click: BREAK connection
                props.state.edges = props.state.edges.filter((edge: any) => edge.source !== n.id);
                if (props.state.editorService) props.state.editorService.triggerAutoSave();
            } else {
                // Left click: START connection
                interaction.connecting = true;
                interaction.connectionStart = { 
                    node: n, 
                    px: outX, 
                    py: outY 
                };
            }
            return;
        }
    }

    // 2. Check for Nodes (Body & Frames)
    const hit = [...props.state.nodes].reverse().find(n => isPointInNode(p.x, p.y, n));
    
    if (hit) {
        // Check for specific frame hit
        const frames = hit.data?.display || [];
        let clickedFrameIdx = -1;
        frames.forEach((_: any, idx: number) => {
            const r = Math.floor(idx / 4);
            const c = idx % 4;
            const fx = hit.position.x + PADDING + c * (FRAME_SQUARE_SIZE + FRAME_GAP);
            const fy = hit.position.y + NODE_HEADER_HEIGHT + 20 + PADDING + r * (FRAME_SQUARE_SIZE + FRAME_GAP);
            if (p.x >= fx && p.x <= fx + FRAME_SQUARE_SIZE && p.y >= fy && p.y <= fy + FRAME_SQUARE_SIZE) {
                clickedFrameIdx = idx;
            }
        });

        if (clickedFrameIdx !== -1) {
            interaction.clickedTarget = { type: 'frame', node: hit, frameIdx: clickedFrameIdx };
        } else {
            interaction.draggedNode = hit;
            interaction.dragStart = { x: p.x - hit.position.x, y: p.y - hit.position.y };
            interaction.clickedTarget = { type: 'node', node: hit };
        }
        interaction.dragStarted = false;
    } else {
        // Background Click prep
        interaction.clickedTarget = { type: 'bg' };
        interaction.dragStarted = false;
        
        if (e.button === 0) { // Left click canvas
            interaction.panning = true;
            interaction.panStart = { x: e.clientX - offset.x, y: e.clientY - offset.y };
        }
    }
}

function onMouseMove(e: MouseEvent) {
    const rect = canvasRef.value!.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const worldArr = fromScreen(x, y);

    interaction.mousePos = worldArr;

    // Hover detection - Reverse for top-most
    interaction.hoveredNode = [...props.state.nodes].reverse().find((n:any) => isPointInNode(worldArr.x, worldArr.y, n));

    // Frame Hover Detection
    let hFrame = null;
    if (interaction.hoveredNode) {
        const frames = interaction.hoveredNode.data?.display || [];
        frames.forEach((_: any, idx: number) => {
            const r = Math.floor(idx / 4);
            const c = idx % 4;
            const fx = interaction.hoveredNode.position.x + PADDING + c * (FRAME_SQUARE_SIZE + FRAME_GAP);
            const fy = interaction.hoveredNode.position.y + NODE_HEADER_HEIGHT + 20 + PADDING + r * (FRAME_SQUARE_SIZE + FRAME_GAP);
            if (worldArr.x >= fx && worldArr.x <= fx + FRAME_SQUARE_SIZE && worldArr.y >= fy && worldArr.y <= fy + FRAME_SQUARE_SIZE) {
                hFrame = { node: interaction.hoveredNode, index: idx };
            }
        });
    }
    interaction.hoveredFrame = hFrame;

    // Dynamic Cursor & Handling
    let onHandle = false;
    let onInputHandle = false;
    for (const n of props.state.nodes) {
        const h = getNodeHeight(n);
        if (Math.abs(worldArr.x - (n.position.x + NODE_WIDTH)) < 15 && Math.abs(worldArr.y - (n.position.y + h/2)) < 15) {
            onHandle = true; break;
        }
        if (Math.abs(worldArr.x - n.position.x) < 15 && Math.abs(worldArr.y - (n.position.y + h/2)) < 15) {
            onInputHandle = true; break;
        }
    }

    // Edge Hover Detection (Last priority)
    let foundEdge = null;
    if (!interaction.hoveredNode && !onHandle && !onInputHandle) {
        // 1. Explicit Edges
        for (const edge of props.state.edges) {
            const source = props.state.nodes.find((n: any) => n.id === edge.source);
            const target = props.state.nodes.find((n: any) => n.id === edge.target);
            if (!source || !target) continue;
            const sH = getNodeHeight(source);
            const tH = getNodeHeight(target);
            const startX = source.position.x + NODE_WIDTH;
            const startY = source.position.y + sH/2;
            const endX = target.position.x;
            const endY = target.position.y + tH/2;
            const dist = getDistToBezier(worldArr.x, worldArr.y, startX, startY, startX + (endX - startX)/2, startY, startX + (endX - startX)/2, endY, endX, endY);
            if (dist < 10) { foundEdge = { type: 'edge', ...edge }; break; }
        }
        // 2. Choice Edges
        if (!foundEdge) {
            for (const n of props.state.nodes) {
                const height = getNodeHeight(n);
                const frames = n.data?.display || [];
                for (let fIdx = 0; fIdx < frames.length; fIdx++) {
                    const choices = frames[fIdx].choice || [];
                    for (let cIdx = 0; cIdx < choices.length; cIdx++) {
                        const targetId = choices[cIdx].target;
                        if (!targetId) continue;
                        const targetNode = props.state.nodes.find((tn: any) => tn.id === targetId || (tn.data && tn.data.id === targetId));
                        if (!targetNode) continue;
                        const startX = n.position.x + NODE_WIDTH;
                        const startY = n.position.y + height/2;
                        const tH = getNodeHeight(targetNode);
                        const endX = targetNode.position.x;
                        const endY = targetNode.position.y + tH/2;
                        const dist = getDistToBezier(worldArr.x, worldArr.y, startX, startY, startX + (endX - startX)/2, startY, startX + (endX - startX)/2, endY, endX, endY);
                        if (dist < 10) { 
                            foundEdge = { type: 'choice', source: n.id, target: targetId, frameIdx: fIdx, choiceIdx: cIdx }; 
                            break; 
                        }
                    }
                    if (foundEdge) break;
                }
                if (foundEdge) break;
            }
        }
    }
    interaction.hoveredEdge = foundEdge;

    if (canvasRef.value) {
        if (interaction.connecting) canvasRef.value.style.cursor = 'crosshair';
        else if (onHandle || onInputHandle) canvasRef.value.style.cursor = 'pointer';
        else if (interaction.hoveredNode) canvasRef.value.style.cursor = 'move';
        else if (interaction.hoveredEdge) canvasRef.value.style.cursor = 'pointer';
        else canvasRef.value.style.cursor = 'default';
    }

    if (interaction.connecting) {
        // Just let draw loop handle it
    } else if (interaction.draggedNode) {
        const dx = worldArr.x - (interaction.draggedNode.position.x + interaction.dragStart.x);
        const dy = worldArr.y - (interaction.draggedNode.position.y + interaction.dragStart.y);
        if (Math.abs(dx) > 3 || Math.abs(dy) > 3) interaction.dragStarted = true;

        interaction.draggedNode.position.x = worldArr.x - interaction.dragStart.x;
        interaction.draggedNode.position.y = worldArr.y - interaction.dragStart.y;
    } else if (interaction.panning) {
        interaction.dragStarted = true;
        offset.x = e.clientX - interaction.panStart.x;
        offset.y = e.clientY - interaction.panStart.y;
    }
}

function onMouseUp() {
    // 0. Perform Click Selection if no significant drag occurred
    if (interaction.mouseDown && !interaction.dragStarted && interaction.clickedTarget) {
        if (interaction.clickedTarget.type === 'node') {
            props.state.node = interaction.clickedTarget.node;
            props.state.profile = null;
        } else if (interaction.clickedTarget.type === 'frame') {
            const h = interaction.clickedTarget;
            // Frame click: ONLY popover, don't open side panel
            props.state.popover = {
                show: true,
                node: h.node,
                index: h.frameIdx,
                x: interaction.mousePos.x * zoom.value + offset.x,
                y: interaction.mousePos.y * zoom.value + offset.y
            };
        } else if (interaction.clickedTarget.type === 'bg') {
            props.state.node = null;
            props.state.profile = null;
            props.state.popover.show = false;
        }
    }

    if (interaction.connecting) {
        // Find target specifically via input handle (Blue / Left)
        const targetNode = props.state.nodes.find((n: any) => {
            const h = getNodeHeight(n);
            const inX = n.position.x;
            const inY = n.position.y + h/2;
            const dist = Math.sqrt(Math.pow(interaction.mousePos.x - inX, 2) + Math.pow(interaction.mousePos.y - inY, 2));
            return dist < 45; // Slightly more forgiving than draw highlight
        });

        if (targetNode) {
            const sourceNode = interaction.connectionStart.node;
            
            // Remove existing edge from this source to avoid duplicates if desired, 
            // or just add/update node-level connection.
            const existingEdgeIndex = props.state.edges.findIndex((e: any) => e.source === sourceNode.id);
            const edgeId = `e-${sourceNode.id}-${targetNode.id}-${Date.now()}`;
            
            if (existingEdgeIndex !== -1) {
                props.state.edges[existingEdgeIndex].target = targetNode.id;
            } else {
                props.state.edges.push({
                    id: edgeId,
                    source: sourceNode.id,
                    target: targetNode.id,
                    animated: true
                });
            }

            if (props.state.editorService) props.state.editorService.triggerAutoSave();
        }
    }

    if (interaction.draggedNode) {
        if (props.state.editorService) props.state.editorService.triggerAutoSave();
    }
    
    interaction.draggedNode = null;
    interaction.connecting = false;
    interaction.connectionStart = null;
    interaction.panning = false;
    interaction.mouseDown = false;
}

function onWheel(e: WheelEvent) {
    e.preventDefault();
    const scaleFactor = 1.05;
    const rect = canvasRef.value!.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    const world = fromScreen(x, y);
    
    if (e.deltaY < 0) zoom.value *= scaleFactor;
    else zoom.value /= scaleFactor;

    // Zoom around cursor
    offset.x = x - world.x * zoom.value;
    offset.y = y - world.y * zoom.value;
}

function onContextMenu(e: MouseEvent) {
    e.preventDefault();
    const rect = canvasRef.value!.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const world = fromScreen(x, y);

    contextMenu.show = true;
    contextMenu.x = e.clientX;
    contextMenu.y = e.clientY;
    contextMenu.canvasPos = world;
}

function handleAddNode() {
    if (props.state.editorService) {
        props.state.editorService.addNode(contextMenu.canvasPos);
    }
    contextMenu.show = false;
}

const resizeCanvas = () => {
    if (canvasRef.value && containerRef.value) {
        canvasRef.value.width = containerRef.value.clientWidth;
        canvasRef.value.height = containerRef.value.clientHeight;
    }
};

let resizeObserver: ResizeObserver | null = null;

onMounted(() => {
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);
    
    // Auto-resize when container changes (e.g. side panel toggled)
    if (containerRef.value) {
        resizeObserver = new ResizeObserver(() => {
            resizeCanvas();
        });
        resizeObserver.observe(containerRef.value);
    }

    requestAnimationFrame(draw);
});

onUnmounted(() => {
    window.removeEventListener('resize', resizeCanvas);
    if (resizeObserver) {
        resizeObserver.disconnect();
    }
});

</script>

<template>
    <div ref="containerRef" class="canvas-wrapper">
        <canvas 
            ref="canvasRef" 
            @mousedown="onMouseDown"
            @mousemove="onMouseMove"
            @mouseup="onMouseUp"
            @mouseleave="onMouseUp"
            @wheel="onWheel"
            @contextmenu="onContextMenu"
        ></canvas>

        <!-- Right-click Menu Overlay (Industrial Style) -->
        <div v-if="contextMenu.show" 
            class="context-menu" 
            :style="{ left: contextMenu.x + 'px', top: contextMenu.y + 'px' }"
        >
            <div class="menu-item" @click="handleAddNode">
                <el-icon><Plus /></el-icon>
                <span>新建剧情节点</span>
            </div>
            <div class="menu-item" @click="() => { zoom = 1.0; offset.x = 0; offset.y = 0; contextMenu.show = false; }">
                <el-icon><Refresh /></el-icon>
                <span>重置视图</span>
            </div>
        </div>
    </div>
</template>

<style scoped>
.canvas-wrapper {
    flex: 1;
    position: relative;
    overflow: hidden;
    background-color: #f1f5f9;
    height: 100%;
}

canvas {
    display: block;
    cursor: crosshair;
}

/* Industrial Context Menu (Same as before but for manual canvas) */
.context-menu {
    position: fixed;
    z-index: 5000;
    min-width: 180px;
    background: #ffffff;
    border: 1px solid #e2e8f0;
    border-radius: 8px;
    padding: 6px;
    box-shadow: 0 10px 25px rgba(0,0,0,0.1);
    display: flex;
    flex-direction: column;
    gap: 2px;
}

.menu-item {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 10px 14px;
    font-size: 13px;
    font-weight: 700;
    color: #475569;
    border-radius: 6px;
    cursor: pointer;
    transition: all 0.2s;
}

.menu-item:hover {
    background: #f1f5f9;
    color: #3b82f6;
}

.menu-item .el-icon { font-size: 1rem; color: #94a3b8; }
.menu-item:hover .el-icon { color: #3b82f6; }
</style>
