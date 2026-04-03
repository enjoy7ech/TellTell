/**
 * ScriptEditorService - Refactored for Vue Flow
 * Manages the project state, file system, and graph topology.
 */
export class ScriptEditorService {
    private state: any;
    private directoryHandle: FileSystemDirectoryHandle | null = null;
    private projectFileHandle: FileSystemFileHandle | null = null;

    constructor(state: any) {
        this.state = state;
        console.log("ScriptEditorService initialized (Vue Flow Mode).");
        this.tryAutoLoadDirectory();
    }

    private async tryAutoLoadDirectory() {
        try {
            const handle = await this.getStoredHandle();
            if (handle) {
                const permission = await (handle as any).queryPermission({ mode: 'readwrite' });
                if (permission === 'granted') {
                    await this.openDirectory(handle);
                } else {
                    this.state.statusText = "发现上次打开的文件夹，点击开启。";
                }
            }
        } catch (e) { console.warn("Auto-load failed", e); }
    }

    public async selectDirectory() {
        try {
            const handle = await (window as any).showDirectoryPicker();
            await this.openDirectory(handle);
        } catch (e) { console.error("Select directory failed", e); }
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
        this.state.statusText = `已载入: ${handle.name}`;
        await this.storeHandle(handle);
    }

    /**
     * Scan Assets: Portraits & Scenes
     */
    public async scanAssets(dirHandle: FileSystemDirectoryHandle) {
        console.log("[Service] Scanning assets...");
        this.state.characterIds = [];
        this.state.portraitHandles.clear();
        this.state.sceneHandles.clear();
        this.state.portraitUrls.clear();
        this.state.sceneUrls.clear();

        try {
            // Find base assets handle
            let assetsHandle = dirHandle;
            try {
                assetsHandle = await dirHandle.getDirectoryHandle("assets");
            } catch (e) { /* use root if assets folder not present */ }

            // Scan Characters
            try {
                const charDir = await assetsHandle.getDirectoryHandle("character");
                for await (const entry of (charDir as any).values()) {
                    if (entry.kind === 'directory') {
                        const charId = entry.name;
                        this.state.characterIds.push(charId);

                        // Auto-create profile if missing, matching existing metadata structure
                        if (!this.state.characterProfiles.has(charId)) {
                            console.log(`[Service] Auto-initializing profile for discovered character: ${charId}`);
                            this.state.characterProfiles.set(charId, {
                                id: charId,
                                name: charId,
                                favor: {},
                                isProtagonist: false,
                                height: 165,
                                weight: 50,
                                age: 18,
                                birthDate: "01-01",
                                bloodType: "O",
                                info: [],
                                phoneNumber: ""
                            });
                        }

                        const picDir = await entry.getDirectoryHandle("portrait");
                        const portraitMap = new Map();
                        for await (const pic of (picDir as any).values()) {
                            if (pic.kind === 'file' && pic.name.match(/\.(png|jpg|jpeg|webp)$/i)) {
                                portraitMap.set(pic.name, pic);
                                const file = await pic.getFile();
                                this.state.portraitUrls.set(`${charId}/${pic.name}`, URL.createObjectURL(file));
                            }
                        }
                        this.state.portraitHandles.set(charId, portraitMap);
                    }
                }
            } catch (e) { console.warn("Character scan failed or not present", e); }

            // Scan Scenes
            try {
                const sceneDir = await assetsHandle.getDirectoryHandle("scene");
                for await (const entry of (sceneDir as any).values()) {
                    if (entry.kind === 'file' && entry.name.match(/\.(png|jpg|jpeg|webp)$/i)) {
                        this.state.sceneHandles.set(entry.name, entry);
                        const file = await entry.getFile();
                        this.state.sceneUrls.set(entry.name, URL.createObjectURL(file));
                    }
                }
            } catch (e) { console.warn("Scene scan failed or not present", e); }

        } catch (e) {
            console.error("Asset scanning engine failed", e);
        }
    }

    /**
     * Load Project: Convert legacy format or use new Vue Flow format
     */
    private async loadProject() {
        if (!this.projectFileHandle) return;
        const file = await this.projectFileHandle.getFile();
        const text = await file.text();
        if (!text) return;

        try {
            const data = JSON.parse(text);
            if (data.graph) {
                // Better detection: if nodes don't have 'position' prop, it's LiteGraph pos
                const isLegacy = data.graph.nodes && data.graph.nodes.length > 0 && !data.graph.nodes[0].position;
                if (isLegacy) {
                    this.convertLegacyToVueFlow(data.graph);
                } else {
                    this.state.nodes = data.graph.nodes || [];
                    this.state.edges = data.graph.edges || [];
                }
            }
            const profiles = data.characterProfiles || data.characters;
            if (profiles) {
                this.state.characterProfiles = new Map(Object.entries(profiles));
            }
        } catch (e) { console.error("Load project failed", e); }
    }

    private convertLegacyToVueFlow(graph: any) {
        console.log("[Service] Converting legacy graph to Vue Flow...");
        const nodes: any[] = [];
        const edges: any[] = [];

        (graph.nodes || []).forEach((n: any) => {
            const pos = n.pos || {};
            nodes.push({
                id: n.id.toString(),
                label: n.title || n.properties?.id || "Node",
                position: { x: Number(pos[0]) || 0, y: Number(pos[1]) || 0 },
                data: { ...n.properties },
                type: 'default'
            });
        });

        (graph.links || []).forEach((l: any) => {
            edges.push({
                id: `e${l[0]}`,
                source: l[1].toString(),
                target: l[3].toString(),
                sourceHandle: 'out',
                targetHandle: 'in'
            });
        });

        this.state.nodes = nodes;
        this.state.edges = edges;
    }

    private isSaving = false;
    private saveTimeout: any = null;

    public triggerAutoSave() {
        if (!this.projectFileHandle) return;

        this.state.statusText = "由于修改，即将保存...";

        if (this.saveTimeout) clearTimeout(this.saveTimeout);
        this.saveTimeout = setTimeout(() => this.executeSave(), 2000);
    }

    private async executeSave() {
        if (!this.projectFileHandle || this.isSaving) return;
        this.isSaving = true;
        console.log("[Service] Executing Debounced Save...");

        try {
            const data = {
                graph: {
                    nodes: this.state.nodes,
                    edges: this.state.edges
                },
                characterProfiles: Object.fromEntries(this.state.characterProfiles)
            };

            const writable = await this.projectFileHandle.createWritable();
            await writable.write(JSON.stringify(data, null, 2));
            await writable.close();

            const now = new Date();
            const timeStr = now.getHours().toString().padStart(2, '0') + ":" +
                now.getMinutes().toString().padStart(2, '0') + ":" +
                now.getSeconds().toString().padStart(2, '0');

            this.state.statusText = `已同步: ${timeStr}`;
        } catch (e) {
            console.error("Auto-save throttled or failed", e);
            this.state.statusText = "同步失败";
        } finally {
            this.isSaving = false;
        }
    }

    /**
     * Publish Bundle: Export for Engine.ts
     */
    public async publishBundle() {
        if (!this.directoryHandle) return;
        console.log("[Service] Publishing bundle...");

        const bundle: any = {
            nodes: this.state.nodes.map((n: any) => ({
                id: (n.data.id || n.id).trim(),
                ...n.data,
                // Explicitly map portrait -> pic for each frame to ensure naming consistency
                display: (n.data.display || []).map((f: any) => ({
                    ...f,
                    dialog: f.dialog ? {
                        ...f.dialog,
                        pic: (f.dialog.pic || f.dialog.portrait || "").trim(),
                        portrait: undefined // Strip the old name
                    } : undefined
                })),
                postNodes: this.state.edges
                    .filter((e: any) => e.source === n.id)
                    .map((e: any) => {
                        const target = this.state.nodes.find((tn: any) => tn.id === e.target);
                        if (target) {
                            return (target.data.id || target.id).trim();
                        }
                        return null;
                    }).filter((id: any) => id !== null)
            })),
            characters: Array.from(this.state.characterProfiles.values()).map(c => ({
                ...c,
                id: c.id.trim()
            }))
        };

        try {
            // Priority: write to 'assets' folder if it exists (for Vite project structure)
            let dataDir: FileSystemDirectoryHandle;
            try {
                const assetsDir = await this.directoryHandle.getDirectoryHandle("assets", { create: true });
                dataDir = await assetsDir.getDirectoryHandle("data", { create: true });
            } catch (e) {
                // Fallback to legacy structure
                const publicDir = await this.directoryHandle.getDirectoryHandle("public", { create: true });
                const assetsDir = await publicDir.getDirectoryHandle("assets", { create: true });
                dataDir = await assetsDir.getDirectoryHandle("data", { create: true });
            }

            const handle = await dataDir.getFileHandle("bundle_story.json", { create: true });
            const writable = await handle.createWritable();
            await writable.write(JSON.stringify(bundle, null, 2));
            await writable.close();

            this.state.statusText = "发布成功";
            import('element-plus').then(({ ElNotification }) => {
                ElNotification({
                    title: '发布成功',
                    message: '剧情资源已同步至 assets/data 目录',
                    type: 'success',
                    position: 'bottom-right'
                });
            });
        } catch (e) { console.error("Publish failed", e); }
    }

    /**
     * Character Management
     */


    public showCharacterProfile(id: string) {
        if (!this.state.characterProfiles.has(id)) {
            this.state.characterProfiles.set(id, { id, name: id, favor: {}, info: [] });
        }
        this.state.profile = this.state.characterProfiles.get(id);
        this.state.profileId = id;
    }

    /**
     * Node Management
     */
    public addNode(pos = { x: 100, y: 100 }) {
        const id = `node_${Math.random().toString(36).substr(2, 6)}`;
        const newNode = {
            id,
            position: pos,
            label: id,
            data: {
                id,
                display: [{
                    screen: { pic: "", text: "" },
                    dialog: { char: "", portrait: "", text: "" }
                }],
                triggers: [],
                mount: [],
                unMount: []
            },
            type: 'default'
        };
        this.state.nodes.push(newNode);
        this.triggerAutoSave();
    }

    public deleteNode(id: string) {
        this.state.nodes = this.state.nodes.filter((n: any) => n.id !== id);
        this.state.edges = this.state.edges.filter((e: any) => e.source !== id && e.target !== id);
        this.state.node = null;
        this.triggerAutoSave();
    }

    public getAllNodeIds() {
        return this.state.nodes.map((n: any) => n.data.id || n.id);
    }

    public selectNode(node: any) {
        this.state.node = node;
        this.state.profile = null;
    }



    /**
     * IndexedDB Storage for Directory Handles
     */
    private async storeHandle(handle: FileSystemDirectoryHandle) {
        const db = await this.openDB();
        return new Promise<void>((resolve, reject) => {
            const tx = db.transaction("handles", "readwrite");
            const req = tx.objectStore("handles").put(handle, "lastDir");
            req.onsuccess = () => resolve();
            req.onerror = () => reject(req.error);
        });
    }

    private async getStoredHandle(): Promise<FileSystemDirectoryHandle | null> {
        const db = await this.openDB();
        return new Promise((resolve, reject) => {
            const tx = db.transaction("handles", "readonly");
            const req = tx.objectStore("handles").get("lastDir");
            req.onsuccess = () => resolve(req.result);
            req.onerror = () => reject(req.error);
        });
    }

    private openDB(): Promise<IDBDatabase> {
        return new Promise((resolve, reject) => {
            const req = indexedDB.open("TellTellEditor", 1);
            req.onupgradeneeded = () => req.result.createObjectStore("handles");
            req.onsuccess = () => resolve(req.result);
            req.onerror = () => reject(req.error);
        });
    }
}
