import "litegraph.js/css/litegraph.css";
import { LGraph, LGraphCanvas, LiteGraph, LGraphNode } from "litegraph.js";

interface StoryEventNode {
    id: string;
    description: string;
    display: any[];
    postNodes: string[];
}

interface StoryBundle {
    version: string;
    timestamp: number;
    nodes: StoryEventNode[];
}

/**
 * TellTell 剧情编辑器
 */
export class ScriptEditor {
    private graph: LGraph;
    private canvas: LGraphCanvas;
    private container: HTMLCanvasElement;
    private directoryHandle: FileSystemDirectoryHandle | null = null;
    private currentFileName: string = "new_event.json";

    constructor(canvasId: string) {
        this.container = document.querySelector(canvasId) as HTMLCanvasElement;
        this.graph = new LGraph();
        this.canvas = new LGraphCanvas(this.container, this.graph);

        this.canvas.background_image = ""; 
        this.canvas.allow_dragnodes = true;
        this.canvas.allow_searchbox = true;

        this.initNodeTypes();
        this.start();
        this.bindEvents();
        this.handleResize();
    }

    private initNodeTypes() {
        class StoryNode extends LGraphNode {
            constructor() {
                super();
                this.title = "Story Node";
                this.addInput("In", LiteGraph.EVENT);
                this.addOutput("Out", LiteGraph.EVENT);
                this.properties = {
                    id: "node_" + Math.random().toString(36).substr(2, 9),
                    description: "Hello World",
                    pic: "bg_default"
                };
                this.size = [180, 80];
            }

            onDrawForeground(ctx: CanvasRenderingContext2D) {
                ctx.fillStyle = "#aaa";
                ctx.font = "10px Arial";
                ctx.fillText(this.properties.id, 10, 15);
            }
        }
        LiteGraph.registerNodeType("TellTell/StoryNode", StoryNode as any);
    }

    private start() {
        this.graph.start();
    }

    private bindEvents() {
        window.addEventListener("resize", () => this.handleResize());
        
        // 保存当前
        document.getElementById("save-btn")?.addEventListener("click", () => this.saveToLocalFile());
        
        // 发布所有 (Bundle)
        document.getElementById("publish-btn")?.addEventListener("click", () => this.publishBundle());
        
        // 目录选择
        document.getElementById("open-dir-btn")?.addEventListener("click", () => this.selectProjectRoot());

        // 切换角色折叠
        document.querySelectorAll('.char-item').forEach(item => {
            item.addEventListener('click', (e) => {
                const target = e.currentTarget as HTMLElement;
                document.querySelectorAll('.char-item').forEach(i => i.classList.remove('active'));
                document.querySelectorAll('.event-list').forEach(l => l.classList.remove('active'));
                target.classList.add('active');
                target.nextElementSibling?.classList.add('active');
            });
        });
    }

    private async selectProjectRoot() {
        try {
            // @ts-ignore
            this.directoryHandle = await window.showDirectoryPicker({ mode: 'readwrite' });
            const pathDisplay = document.getElementById("dir-path");
            if (pathDisplay && this.directoryHandle) {
                pathDisplay.innerText = `Folder: ${this.directoryHandle.name}`;
            }
        } catch (err) {
            console.error("User cancelled project folder selection.");
        }
    }

    /**
     * 发布：遍历文件夹内所有 .json，合并成一个带时间戳的大文件
     */
    public async publishBundle() {
        if (!this.directoryHandle) {
            alert("No folder selected. Please select Project Root first.");
            return;
        }

        const bundle: StoryBundle = {
            version: "1.0.0",
            timestamp: Date.now(),
            nodes: []
        };

        const status = document.getElementById("status");
        if (status) status.innerText = "Publishing bundle...";

        try {
            // 1. 递归/遍历 文件夹下所有 .json 文件
            for await (const entry of (this.directoryHandle as any).values()) {
                if (entry.kind === 'file' && entry.name.endsWith('.json')) {
                    // 排除掉已经发出的 bundle.json 本身
                    if (entry.name.startsWith('bundle_')) continue;

                    const file = await entry.getFile();
                    const content = await file.text();
                    try {
                        const json = JSON.parse(content);
                        if (json.nodes && Array.isArray(json.nodes)) {
                            // 将所有文件的 nodes 内容打平合并
                            bundle.nodes.push(...json.nodes);
                            console.log(`Bundled: ${entry.name} (${json.nodes.length} nodes)`);
                        }
                    } catch (e) {
                        console.warn(`Skip invalid JSON: ${entry.name}`);
                    }
                }
            }

            // 2. 将合成后的内容写入 bundle_{timestamp}.json
            const fileName = `bundle_${bundle.timestamp}.json`;
            const bundleHandle = await this.directoryHandle.getFileHandle(fileName, { create: true });
            const writable = await (bundleHandle as any).createWritable();
            await writable.write(JSON.stringify(bundle, null, 2));
            await writable.close();

            if (status) status.innerText = `Published: ${fileName}`;
            alert(`Succesfully bundled ${bundle.nodes.length} nodes into ${fileName}`);

        } catch (err) {
            console.error("Bundle publish failed:", err);
            if (status) status.innerText = "Publish Error";
        }
    }

    private async saveToLocalFile() {
        if (!this.directoryHandle) {
            alert("Folder missing!");
            return;
        }

        const data = this.serializeGraph();
        try {
            const fileName = window.prompt("Save current event as:", this.currentFileName) || "event.json";
            const fileHandle = await this.directoryHandle.getFileHandle(fileName, { create: true });
            const writable = await (fileHandle as any).createWritable();
            await writable.write(JSON.stringify(data, null, 2));
            await writable.close();
            this.currentFileName = fileName;
            
            const status = document.getElementById("status");
            if (status) status.innerText = `Saved ${fileName}`;
        } catch (err) {
            console.error("Save failed", err);
        }
    }

    private serializeGraph() {
        const nodes = (this.graph as any)._nodes || [];
        const result: { nodes: StoryEventNode[] } = { nodes: [] };

        nodes.forEach((node: any) => {
            const storyNode: StoryEventNode = {
                id: node.properties.id,
                description: node.properties.description,
                display: [
                    {
                        screen: { pic: node.properties.pic },
                        dialog: { char: "unknown", text: node.properties.description }
                    }
                ],
                postNodes: []
            };

            if (node.outputs && node.outputs[0].links) {
                node.outputs[0].links.forEach((linkId: number) => {
                    const link = this.graph.links[linkId];
                    if (link) {
                        const targetNode = this.graph.getNodeById(link.target_id);
                        if (targetNode) {
                            storyNode.postNodes.push((targetNode as any).properties.id);
                        }
                    }
                });
            }
            result.nodes.push(storyNode);
        });
        return result;
    }

    private handleResize() {
        const parent = this.container.parentElement;
        if (parent) {
            this.container.width = parent.clientWidth;
            this.container.height = parent.clientHeight;
        }
    }
}

document.addEventListener("DOMContentLoaded", () => {
    new ScriptEditor("#main-canvas");
});
