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
        this.resetState();
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

    private resetState() {
        console.log("[Service] Resetting state for new directory...");
        this.state.statusText = "正在载入...";
        
        // Revoke asset URLs to avoid memory leaks
        if (this.state.portraitUrls) {
            this.state.portraitUrls.forEach((url: string) => URL.revokeObjectURL(url));
            this.state.portraitUrls.clear();
        }
        if (this.state.sceneUrls) {
            this.state.sceneUrls.forEach((url: string) => URL.revokeObjectURL(url));
            this.state.sceneUrls.clear();
        }
        
        // Clear maps and arrays
        this.state.nodes = [];
        this.state.edges = [];
        this.state.characterIds = [];
        this.state.characterProfiles.clear();
        this.state.portraitHandles.clear();
        this.state.sceneHandles.clear();
        
        // Clear selection and UI state
        this.state.node = null;
        this.state.profile = null;
        this.state.profileId = "";
        this.state.showGraph = false;
        if (this.state.popover) {
            this.state.popover.visible = false;
        }
    }

    public async createCharacter(id: string) {
        console.log(`[Service] createCharacter called with ID: ${id}`);
        if (!id || id.trim() === "") {
            import('element-plus').then(({ ElMessage }) => ElMessage.warning("ID 不能为空"));
            return false;
        }

        if (this.state.characterIds.includes(id)) {
            import('element-plus').then(({ ElMessage }) => ElMessage.error("角色 ID 已存在"));
            return false;
        }

        try {
            // 1. Initialize profile in state
            const newProfile = { 
                id, 
                name: id, 
                favor: {}, 
                isProtagonist: false,
                height: 165,
                weight: 50,
                age: 18,
                birthDate: "01-01",
                bloodType: "O",
                info: [],
                phoneNumber: "",
                soul: "" 
            };
            
            // 2. Update state - Use spread to trigger full reactivity swap
            this.state.characterProfiles.set(id, newProfile);
            const updatedIds = [...this.state.characterIds, id];
            this.state.characterIds = updatedIds;
            
            console.log("[Service] State updated with new character:", id);

            // 3. Selection change
            this.showCharacterProfile(id);

            // 4. Persistence (Folders)
            if (this.directoryHandle) {
                try {
                    const assetsHandle = await this.directoryHandle.getDirectoryHandle("assets", { create: true });
                    const characterRoot = await assetsHandle.getDirectoryHandle("character", { create: true });
                    const charDir = await characterRoot.getDirectoryHandle(id, { create: true });
                    await charDir.getDirectoryHandle("portrait", { create: true }).catch(() => {});
                } catch (e) {
                    console.warn("Could not create folders, might be already there or missing permissions", e);
                }
            }

            // 5. Save profile.json / soul.md
            await this.saveCharacter(id, newProfile);

            import('element-plus').then(({ ElMessage }) => {
                ElMessage.success({
                    message: `角色 [${id}] 已成功创建并初始化`,
                    duration: 3000
                });
            });
            
            return true;
        } catch (e: any) {
            console.error("Create character method failed:", e);
            import('element-plus').then(({ ElMessage }) => {
                ElMessage.error("创建失败: " + (e.message || e));
            });
            return false;
        }
    }

    /**
     * Scan Assets: Portraits & Scenes
     */
    public async scanAssets(dirHandle: FileSystemDirectoryHandle) {
        console.log("[Service] Scanning assets...");
        
        // Use temporary collections to avoid UI flickering/emptying
        const tempCharacterIds: string[] = [];
        const tempPortraitHandles = new Map();
        const tempSceneHandles = new Map();
        const tempPortraitUrls = new Map();
        const tempSceneUrls = new Map();

        try {
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
                        tempCharacterIds.push(charId);

                        // Auto-create profile if missing
                        if (!this.state.characterProfiles.has(charId)) {
                            console.log(`[Service] Auto-initializing profile for: ${charId}`);
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
                                tempPortraitUrls.set(`${charId}/${pic.name}`, URL.createObjectURL(file));
                            }
                        }
                        tempPortraitHandles.set(charId, portraitMap);
                    }
                }
            } catch (e) { console.warn("Character scan failed", e); }

            // Scan Scenes
            try {
                const sceneDir = await assetsHandle.getDirectoryHandle("scene");
                for await (const entry of (sceneDir as any).values()) {
                    if (entry.kind === 'file' && entry.name.match(/\.(png|jpg|jpeg|webp)$/i)) {
                        tempSceneHandles.set(entry.name, entry);
                        const file = await entry.getFile();
                        tempSceneUrls.set(entry.name, URL.createObjectURL(file));
                    }
                }
            } catch (e) { console.warn("Scene scan failed", e); }

            // ATOMIC SWAP: Only update state when everything is successfully scanned
            this.state.characterIds = tempCharacterIds;
            
            // For Maps, we clear and re-fill or replace if it's a reactive object
            this.state.portraitHandles.clear();
            tempPortraitHandles.forEach((v, k) => this.state.portraitHandles.set(k, v));
            
            this.state.sceneHandles.clear();
            tempSceneHandles.forEach((v, k) => this.state.sceneHandles.set(k, v));
            
            // Revoke old URLs before clearing and replacing
            this.state.portraitUrls.forEach((url: string) => URL.revokeObjectURL(url));
            this.state.portraitUrls.clear();
            tempPortraitUrls.forEach((v, k) => this.state.portraitUrls.set(k, v));
            
            this.state.sceneUrls.forEach((url: string) => URL.revokeObjectURL(url));
            this.state.sceneUrls.clear();
            tempSceneUrls.forEach((v, k) => this.state.sceneUrls.set(k, v));

        } catch (e) {
            console.error("Asset scanning engine failed", e);
        }
    }

    /**
     * Save Asset: Common method for saving blobs to character/portrait
     */
    public async savePortraitAsset(charId: string, portraitId: string, blob: Blob) {
        if (!this.directoryHandle) throw new Error("没有打开任何目录");
        try {
            const assetsHandle = await this.directoryHandle.getDirectoryHandle("assets", { create: true });
            const characterHandle = await assetsHandle.getDirectoryHandle("character", { create: true });
            const charRoot = await characterHandle.getDirectoryHandle(charId, { create: true });
            const portraitRoot = await charRoot.getDirectoryHandle("portrait", { create: true });
            
            // Force .webp extension for size efficiency
            const filename = portraitId.endsWith('.webp') ? portraitId : `${portraitId}.webp`;
            const fileHandle = await portraitRoot.getFileHandle(filename, { create: true });
            const writable = await fileHandle.createWritable();
            await writable.write(blob);
            await writable.close();
            
            console.log(`[Service] Asset saved: ${charId}/${filename}`);
            return true;
        } catch (e) {
            console.error(`Save portrait failed: ${charId}/${portraitId}`, e);
            throw e;
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
            this.state.statusText = "项目已载入";

            // Migration: handle legacy profiles in main file
            const profiles = data.characterProfiles || data.characters;
            if (profiles) {
                console.log("[Service] Migrating legacy profiles...");
                for (const [id, prof] of Object.entries(profiles)) {
                    this.state.characterProfiles.set(id, prof);
                }
            }
            await this.loadCharacters();
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
                }
            };

            const writable = await this.projectFileHandle.createWritable();
            await writable.write(JSON.stringify(data, null, 2));
            await writable.close();

            // Save individual character files
            for (const [id, profile] of this.state.characterProfiles.entries()) {
                await this.saveCharacter(id, profile);
            }

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
            characters: Array.from(this.state.characterProfiles.values() as any[]).map((c: any) => ({
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
            const newProfile = { id, name: id, favor: {}, info: [], soul: "" };
            this.state.characterProfiles.set(id, newProfile);
        }
        this.state.profile = this.state.characterProfiles.get(id);
        this.state.profileId = id;
        this.state.node = null;
    }

    private async saveCharacter(id: string, profile: any) {
        if (!this.directoryHandle) return;
        try {
            const assetsHandle = await this.directoryHandle.getDirectoryHandle("assets", { create: true });
            const characterRoot = await assetsHandle.getDirectoryHandle("character", { create: true });
            const charDir = await characterRoot.getDirectoryHandle(id, { create: true });

            // 1. Save profile.json (Everything except soul)
            const { soul, ...rest } = profile;
            const profileFile = await charDir.getFileHandle("profile.json", { create: true });
            const pWritable = await profileFile.createWritable();
            await pWritable.write(JSON.stringify(rest, null, 2));
            await pWritable.close();

            // 2. Save soul.md (Soul description)
            const soulFile = await charDir.getFileHandle("soul.md", { create: true });
            const sWritable = await soulFile.createWritable();
            await sWritable.write(soul || "");
            await sWritable.close();
        } catch (e) {
            console.error(`Save character ${id} failed`, e);
        }
    }

    private async loadCharacters() {
        if (!this.directoryHandle) return;
        try {
            const assetsHandle = await this.directoryHandle.getDirectoryHandle("assets", { create: true });
            const characterRoot = await assetsHandle.getDirectoryHandle("character", { create: true });
            
            const foundIds: string[] = [];
            for await (const entry of (characterRoot as any).values()) {
                if (entry.kind === 'directory') {
                    const id = entry.name;
                    foundIds.push(id);
                    
                    try {
                        const profileFile = await entry.getFileHandle("profile.json");
                        const pFile = await profileFile.getFile();
                        const profile = JSON.parse(await pFile.text());
                        
                        // Load soul.md if exists
                        let soulContent = "";
                        try {
                            const soulFile = await entry.getFileHandle("soul.md");
                            const sFile = await soulFile.getFile();
                            soulContent = await sFile.text();
                        } catch(e) {}
                        
                        this.state.characterProfiles.set(id, { ...profile, soul: soulContent });
                    } catch (e) {
                         console.warn(`Load profile for ${id} failed`, e);
                    }
                }
            }
            this.state.characterIds = foundIds;
        } catch (e) {
            console.warn("Load characters failed", e);
        }
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
                unMount: [],
                tags: []
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

    public async playPreview(nodeId?: string) {
        // 1. Ensure bundle is up to date
        await this.publishBundle();
        
        // 2. Set current preview URL with optional startNode
        let url = "http://localhost:5173/?skipHome=true";
        if (nodeId) {
            url += `&startNode=${nodeId}`;
        }
        
        // Force reload even if URL same or just changed query param
        this.state.previewUrl = ""; 
        setTimeout(() => {
            this.state.previewUrl = url;
            this.state.showPreview = true;
        }, 50);

        this.state.statusText = nodeId ? `从节点 [${nodeId}] 预览` : "正在启动预览";
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
