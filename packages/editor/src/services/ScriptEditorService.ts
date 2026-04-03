import { LGraph, LGraphCanvas, LiteGraph, LGraphNode } from "litegraph.js";

/**
 * Pure logic and state management service for TellTell Editor.
 * Decoupled from native DOM manipulation.
 */
export class ScriptEditorService {
    private graph: LGraph;
    private canvas: LGraphCanvas | null = null;
    private state: any; // Reactive Vue State

    private directoryHandle: FileSystemDirectoryHandle | null = null;
    private projectFileHandle: FileSystemFileHandle | null = null;
    private portraitHandles: Map<string, Map<string, FileSystemFileHandle>> = new Map();

    constructor(state: any) {
        this.state = state;
        this.graph = new LGraph();
        this.initNodeTypes();
        this.graph.start();
        
        // Connect some core graph events to Vue state
        (this.graph as any).onNodeAdded = () => this.refreshFileList();
        (this.graph as any).onNodeRemoved = () => this.refreshFileList();
        
        console.log("ScriptEditorService initialized (Pure Logic Mode).");
        this.tryAutoLoadDirectory();
    }

    /**
     * 尝试从 IndexedDB 恢复上一次选择的文件夹
     */
    private async tryAutoLoadDirectory() {
        try {
            const handle = await this.getStoredHandle();
            if (handle) {
                // 需要用户交互才能重新激活权限，大部分浏览器会在第一次请求时弹出恢复提示
                const permission = await (handle as any).queryPermission({ mode: 'readwrite' });
                if (permission === 'granted') {
                    await this.openDirectory(handle);
                } else {
                    console.log("Auto-load directory found but needs permission.");
                    this.state.statusText = "发现上次打开的文件夹，点击侧边栏开启。";
                }
            }
        } catch (e) { console.warn("Auto-load directory failed", e); }
    }

    private async openDirectory(handle: FileSystemDirectoryHandle) {
        this.directoryHandle = handle;
        this.state.directoryName = handle.name;
        this.state.hasDirectory = true;
        await this.scanAssets(handle);
        try {
            this.projectFileHandle = await handle.getFileHandle("workspace.tell", { create: true });
            await this.loadProject();
        } catch (err) { console.error(err); }
        this.state.statusText = `已还原项目: ${handle.name}`;
        await this.storeHandle(handle);
    }

    public initCanvas(canvasEl: HTMLCanvasElement) {
        this.canvas = new LGraphCanvas(canvasEl, this.graph);
        this.canvas.background_image = "";
        this.canvas.allow_dragnodes = true;
        this.canvas.allow_searchbox = true;
        this.setupCustomMenu();
        this.initResizeObserver(canvasEl);
    }

    private initResizeObserver(canvasEl: HTMLCanvasElement) {
        const parent = canvasEl.parentElement;
        if (!parent) return;
        const observer = new ResizeObserver(() => {
            const width = parent.clientWidth;
            const height = parent.clientHeight;
            if (width > 0 && height > 0) {
                canvasEl.width = width;
                canvasEl.height = height;
                this.canvas?.resize(width, height);
                (this.canvas as any)?.setDirty(true, true);
            }
        });
        observer.observe(parent);
    }

    private setupCustomMenu() {
        const self = this;
        if (!this.canvas) return;
        this.canvas.getMenuOptions = function () {
            return [
                {
                    content: "新建剧情节点",
                    callback: (_value: any, _options: any, e: MouseEvent) => {
                        const node = LiteGraph.createNode("TellTell/StoryNode");
                        if (node && self.canvas) {
                            node.pos = self.canvas.convertEventToCanvasOffset(e);
                            self.graph.add(node);
                        }
                    }
                },
                null,
                {
                    content: "清理所有节点",
                    callback: () => {
                        if (confirm("确定要清空整个画布吗？")) {
                            self.graph.clear();
                        }
                    }
                },
                {
                    content: "自动排列布局",
                    callback: () => self.graph.arrange()
                }
            ];
        };
    }

    private initNodeTypes() {
        const self = this;
        class StoryNode extends LGraphNode {
            constructor() {
                super();
                this.title = "Story Node";
                this.addInput("In", LiteGraph.EVENT);
                this.addOutput("Next", LiteGraph.EVENT);
                this.properties = {
                    id: "node_" + Math.random().toString(36).substr(2, 6),
                    repeatable: false,
                    priority: 0,
                    folder: "Root",
                    display: [
                        {
                            screen: { pic: "", text: "" },
                            dialog: { char: "", portrait: "", text: "请输入剧情文本" }
                        }
                    ],
                    triggers: [],
                    mount: [],
                    unMount: []
                };
                this.size = [240, 110];
            }

            onDrawForeground(ctx: CanvasRenderingContext2D) {
                if (this.flags.collapsed) return;
                ctx.fillStyle = "#555";
                ctx.fillRect(5, 30, this.size[0] - 10, 1);
                ctx.fillStyle = "#888";
                ctx.font = "italic 9px Inter";
                ctx.fillText(this.properties.id, 10, 42);
                ctx.fillStyle = "#f1c40f";
                ctx.font = "bold 9px Inter";
                ctx.fillText(`分镜: ${this.properties.display?.length || 0}`, 10, 56);
                
                ctx.fillStyle = "#fff";
                ctx.font = "11px Inter";
                const firstFrame = this.properties.display?.[0];
                const desc = firstFrame?.dialog?.text || "(Empty Node)";
                const truncated = desc.length > 25 ? desc.substr(0, 25) + "..." : desc;
                ctx.fillText(truncated, 10, 75);
            }

            onSelected() { self.selectNode(this); }
            onDeselected() { self.deselectNode(); }
        }
        LiteGraph.registerNodeType("TellTell/StoryNode", StoryNode as any);
    }

    public selectNode(node: any) {
        this.state.profile = null;
        this.state.node = node;
        if (node.properties) {
            if (!node.properties.triggers) node.properties.triggers = [];
            if (!node.properties.mount) node.properties.mount = [];
            if (!node.properties.unMount) node.properties.unMount = [];
        }
    }

    private deselectNode() {
       // Only hide if we aren't editing a profile
       if (this.state.node) this.state.node = null;
    }

    public showCharacterProfile(id: string) {
        this.state.node = null;
        this.state.profileId = id;
        this.state.profile = this.state.characterProfiles.get(id);
    }

    public async selectDirectory() {
        try {
            // @ts-ignore
            const handle = await window.showDirectoryPicker();
            await this.openDirectory(handle);
        } catch (err) { console.error(err); }
    }

    /**
     * IndexedDB 存储辅助 (原生实现，无需额外依赖)
     */
    private async storeHandle(handle: FileSystemDirectoryHandle) {
        return new Promise<void>((resolve, reject) => {
            const request = indexedDB.open("TellTellEditor", 1);
            request.onupgradeneeded = (e: any) => {
                const db = e.target.result;
                if (!db.objectStoreNames.contains("handles")) {
                    db.createObjectStore("handles");
                }
            };
            request.onsuccess = (e: any) => {
                const db = e.target.result;
                const tx = db.transaction("handles", "readwrite");
                const store = tx.objectStore("handles");
                store.put(handle, "lastDirectory");
                tx.oncomplete = () => resolve();
            };
            request.onerror = () => reject(request.error);
        });
    }

    private async getStoredHandle(): Promise<FileSystemDirectoryHandle | null> {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open("TellTellEditor", 1);
            request.onupgradeneeded = (e: any) => {
                const db = e.target.result;
                if (!db.objectStoreNames.contains("handles")) {
                    db.createObjectStore("handles");
                }
            };
            request.onsuccess = (e: any) => {
                const db = e.target.result;
                const tx = db.transaction("handles", "readonly");
                const store = tx.objectStore("handles");
                const getReq = store.get("lastDirectory");
                getReq.onsuccess = () => resolve(getReq.result || null);
                getReq.onerror = () => reject(getReq.error);
            };
            request.onerror = () => reject(request.error);
        });
    }

    private sceneHandles: Map<string, FileSystemFileHandle> = new Map();

    private async scanAssets(handle: FileSystemDirectoryHandle) {
        this.state.characterIds = [];
        this.portraitHandles.clear();
        this.sceneHandles.clear();
        this.state.portraitHandles = this.portraitHandles;
        this.state.sceneHandles = this.sceneHandles;

        try {
            const assetsHandle = await handle.getDirectoryHandle("assets");
            
            // 1. Scan Characters & Portraits
            try {
                const charRootHandle = await assetsHandle.getDirectoryHandle("character");
                for await (const entry of (charRootHandle as any).values()) {
                    if (entry.kind === "directory") {
                        const charId = entry.name;
                        this.state.characterIds.push(charId);
                        if (!this.state.characterProfiles.has(charId)) {
                            this.state.characterProfiles.set(charId, { 
                                id: charId, name: charId.toUpperCase(), favor: {},
                                isProtagonist: false, height: 165, age: 18, birthDate: "01-01", info: []
                            });
                        }
                        try {
                            const subHandle = await entry.getDirectoryHandle("portrait");
                            const pMap = new Map<string, FileSystemFileHandle>();
                            for await (const pEntry of (subHandle as any).values()) {
                                if (pEntry.kind === "file" && pEntry.name.endsWith(".webp")) {
                                    pMap.set(pEntry.name.split('.')[0], pEntry);
                                }
                            }
                            this.portraitHandles.set(charId, pMap);
                        } catch (e) {}
                    }
                }
            } catch (e) { console.warn("Character folder missing"); }

            // 2. Scan Scene Backgrounds
            try {
                const sceneHandle = await assetsHandle.getDirectoryHandle("scene");
                for await (const entry of (sceneHandle as any).values()) {
                    if (entry.kind === "file" && entry.name.endsWith(".webp")) {
                        const sceneId = entry.name.split('.')[0];
                        this.sceneHandles.set(sceneId, entry);
                    }
                }
            } catch (e) { console.warn("Scene folder missing"); }

        } catch (e) { console.warn("Assets directory not found", e); }
        this.refreshFileList();
    }

    private async loadProject() {
        if (!this.projectFileHandle) return;
        try {
            const file = await this.projectFileHandle.getFile();
            const text = await file.text();
            if (text.trim()) {
                const data = JSON.parse(text);
                this.graph.configure(data.graph || data);
                if (data.characterProfiles) {
                    for (const [k, v] of Object.entries(data.characterProfiles)) {
                        this.state.characterProfiles.set(k, v);
                    }
                }
                this.refreshFileList();
            }
        } catch (err) { console.error(err); }
    }

    public async saveProject() {
        if (!this.projectFileHandle) return;
        try {
            const data = {
                graph: this.graph.serialize(),
                characterProfiles: Object.fromEntries(this.state.characterProfiles)
            };
            const writable = await (this.projectFileHandle as any).createWritable();
            await writable.write(JSON.stringify(data, null, 2));
            await writable.close();
            this.state.statusText = "项目已自动保存";
        } catch (err) { console.error(err); }
    }

    public async publishBundle() {
        if (!this.directoryHandle) return alert("请先打开素材文件夹。");
        try {
            const result: { nodes: any[], characters: any[] } = { 
                nodes: [],
                characters: Array.from(this.state.characterProfiles.values())
            };
            const nodes = (this.graph as any)._nodes || [];
            nodes.forEach((node: any) => {
                result.nodes.push({
                    id: node.properties.id,
                    repeatable: node.properties.repeatable || false,
                    priority: node.properties.priority || 0,
                    display: node.properties.display.map((frame: any) => ({
                        screen: frame.screen,
                        dialog: { char: frame.dialog.char, text: frame.dialog.text, pic: frame.dialog.portrait }
                    })),
                    triggers: node.properties.triggers || [],
                    mount: node.properties.mount || [],
                    unMount: node.properties.unMount || [],
                    postNodes: (node.outputs?.[0]?.links || []).map((linkId: number) => {
                        const targetNode = this.graph.getNodeById(this.graph.links[linkId].target_id);
                        return (targetNode as any).properties.id;
                    })
                });
            });

            // 发布到 assets/data/bundle_story.json
            const assetsHandle = await this.directoryHandle.getDirectoryHandle("assets");
            const dataHandle = await assetsHandle.getDirectoryHandle("data");
            const bundleHandle = await dataHandle.getFileHandle("bundle_story.json", { create: true });
            
            const writable = await (bundleHandle as any).createWritable();
            await writable.write(JSON.stringify(result, null, 2));
            await writable.close();
            alert("发布成功！已导出 assets/data/bundle_story.json");
        } catch (err) { console.error(err); }
    }

    public refreshFileList() {
        const nodes = (this.graph as any)._nodes || [];
        const groups = new Map<string, any[]>();
        nodes.forEach((n: any) => {
            const folder = n.properties.folder || "Root";
            if (!groups.has(folder)) groups.set(folder, []);
            groups.get(folder)?.push(n);
        });
        this.state.folderGroups = groups;
    }

    private handleUrlCache: Map<FileSystemFileHandle, string> = new Map();

    public getImageUrl = async (handle: FileSystemFileHandle | undefined): Promise<string> => {
        if (!handle) return "";
        if (this.handleUrlCache.has(handle)) return this.handleUrlCache.get(handle)!;
        
        try {
            const file = await handle.getFile();
            const url = URL.createObjectURL(file);
            this.handleUrlCache.set(handle, url);
            return url;
        } catch (e) {
            console.error("Image load fail", e);
            return "";
        }
    }

    public playPreview() {
        this.saveProject().then(() => window.open("/", "_blank"));
    }

    public addFolder() {
        const name = prompt("输入新章节文件夹名称:", "新章节");
        if (name) {
            this.state.statusText = `文件夹 '${name}' 已创建 (逻辑占位)`;
            console.log(`Folder ${name} placeholder`);
        }
    }

    public getAllNodeIds(): string[] {
        const nodes = (this.graph as any)._nodes || [];
        return nodes.map((n: any) => n.properties?.id).filter(Boolean);
    }
}
