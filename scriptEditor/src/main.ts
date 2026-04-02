import "litegraph.js/css/litegraph.css";
import { LGraph, LGraphCanvas, LiteGraph, LGraphNode } from "litegraph.js";

/**
 * TellTell 剧情编辑器 (基于 Assets 目录的自动化版本)
 */
export class ScriptEditor {
    private graph: LGraph;
    private canvas: LGraphCanvas;
    private container: HTMLCanvasElement;
    private directoryHandle: FileSystemDirectoryHandle | null = null;
    private projectFileHandle: FileSystemFileHandle | null = null;

    // 扫描到的资源句柄 Map (Name -> Handle)
    private sceneHandles: Map<string, FileSystemFileHandle> = new Map();
    private characterIds: string[] = [];
    private portraitHandles: Map<string, Map<string, FileSystemFileHandle>> = new Map();
    
    // 角色档案元数据 (id -> { name, isProtagonist, etc. })
    private characterProfiles: Map<string, any> = new Map();

    private urlCache: Map<string, string> = new Map();

    constructor(canvasId: string) {
        this.container = document.querySelector(canvasId) as HTMLCanvasElement;
        this.graph = new LGraph();
        this.canvas = new LGraphCanvas(this.container, this.graph);

        (this.canvas as any).resize_canvas = false;
        this.canvas.background_image = "";
        this.canvas.allow_dragnodes = true;
        this.canvas.allow_searchbox = true;

        this.initNodeTypes();
        this.setupCustomMenu();
        this.graph.start();
        this.bindEvents();
        this.initResizeObserver();
        
        console.log("TellTell Script Editor (Folder Mode) Initialized.");
    }

    private initResizeObserver() {
        const parent = this.container.parentElement;
        if (!parent) return;
        let timeout: any;
        const observer = new ResizeObserver(() => {
            if (timeout) clearTimeout(timeout);
            timeout = setTimeout(() => this.handleResize(), 50);
        });
        observer.observe(parent);
    }

    private handleResize() {
        const parent = this.container.parentElement;
        if (parent) {
            const width = parent.clientWidth;
            const height = parent.clientHeight;
            if (width > 0 && height > 0) {
                this.container.width = width;
                this.container.height = height;
                this.canvas.resize(width, height);
                (this.canvas as any).setDirty(true, true);
            }
        }
    }

    private setupCustomMenu() {
        const self = this;
        this.canvas.getMenuOptions = function () {
            return [
                {
                    content: "新建剧情节点",
                    callback: (_value: any, _options: any, e: MouseEvent) => {
                        const node = LiteGraph.createNode("TellTell/StoryNode");
                        if (node) {
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
                this.size = [240, 120];
            }

            onDrawForeground(ctx: CanvasRenderingContext2D) {
                if (this.flags.collapsed) return;
                ctx.fillStyle = "#555";
                ctx.fillRect(5, 30, this.size[0] - 10, 2);
                ctx.fillStyle = "#888";
                ctx.font = "italic 11px Inter";
                ctx.fillText(this.properties.id, 10, 45);
                ctx.fillStyle = "#aaa";
                ctx.font = "12px Inter";
                const firstFrame = this.properties.display?.[0];
                const desc = firstFrame?.dialog?.text || "(Empty Node)";
                const truncated = desc.length > 20 ? desc.substr(0, 20) + "..." : desc;
                ctx.fillText(truncated, 10, 65);
                ctx.fillStyle = "#f1c40f";
                ctx.font = "10px Inter";
                ctx.fillText(`分镜数量: ${this.properties.display?.length || 0}`, 10, 85);
                if (this.properties.repeatable) ctx.fillText("♻ 可重复触发", 80, 85);
            }

            onSelected() { self.showProperties(this); }
            onDeselected() { self.hideProperties(); }
        }
        LiteGraph.registerNodeType("TellTell/StoryNode", StoryNode as any);
    }

    private async selectDirectory() {
        try {
            // @ts-ignore
            const handle = await window.showDirectoryPicker();
            this.directoryHandle = handle;
            
            const pathDisplay = document.getElementById("dir-path");
            if (pathDisplay) pathDisplay.innerText = `当前目录: ${handle.name}`;

            // 1. 扫描 Assets
            await this.scanAssets(handle);
            
            // 2. 查找或创建 workspace.tell
            try {
                this.projectFileHandle = await handle.getFileHandle("workspace.tell", { create: true });
                await this.loadProject();
            } catch (err) {
                console.error("无法访问 workspace.tell", err);
            }

            const status = document.getElementById("status");
            if (status) status.innerText = "资源已扫描 & 项目已加载";
            
        } catch (err) {
            console.error("Directory selection cancelled.");
        }
    }

    private async scanAssets(handle: FileSystemDirectoryHandle) {
        this.sceneHandles.clear();
        this.characterIds = [];
        this.portraitHandles.clear();

        try {
            // 扫描 scene 目录
            try {
                const sceneHandle = await handle.getDirectoryHandle("scene");
                for await (const entry of (sceneHandle as any).values()) {
                    if (entry.kind === "file" && entry.name.endsWith(".webp")) {
                        this.sceneHandles.set(entry.name.split('.')[0], entry);
                    }
                }
            } catch (e) { console.warn("No 'scene' folder found."); }

            // 扫描 character 目录下的子目录 (CharacterId) 及其 portrait 子目录
            try {
                const charRootHandle = await handle.getDirectoryHandle("character");
                for await (const entry of (charRootHandle as any).values()) {
                    if (entry.kind === "directory") {
                        const charId = entry.name;
                        this.characterIds.push(charId);
                        
                        // 设置默认档案数据 (如果系统中还没有)
                        if (!this.characterProfiles.has(charId)) {
                            this.characterProfiles.set(charId, { 
                                id: charId, 
                                name: charId.toUpperCase(),
                                favor: 0,
                                isProtagonist: false,
                                info: []
                            });
                        }
                        
                        // 继续扫描该角色目录下的 portrait 文件夹
                        try {
                            const subHandle = await entry.getDirectoryHandle("portrait");
                            const pMap = new Map<string, FileSystemFileHandle>();
                            for await (const pEntry of (subHandle as any).values()) {
                                if (pEntry.kind === "file" && pEntry.name.endsWith(".webp")) {
                                    pMap.set(pEntry.name.split('.')[0], pEntry);
                                }
                            }
                            this.portraitHandles.set(charId, pMap);
                        } catch (e) {
                             console.warn(`No 'portrait' folder for character: ${charId}`);
                        }
                    }
                }
            } catch (e) { console.warn("No 'character' folder found."); }

            console.log("Assets Scanned (Handles Captured).");
        } catch (err) {
            console.error("Error scanning assets", err);
        }
    }

    private async loadProject() {
        if (!this.projectFileHandle) return;
        try {
            const file = await this.projectFileHandle.getFile();
            const text = await file.text();
            if (text.trim()) {
                const data = JSON.parse(text);
                this.graph.configure(data.graph || data); // 兼容旧版
                
                // 加载角色档案数据 (如果存在)
                if (data.characterProfiles) {
                    this.characterProfiles = new Map(Object.entries(data.characterProfiles));
                }
                
                this.refreshFileList();
            }
        } catch (err) {
            console.error("解析项目文件失败", err);
        }
    }

    private async saveProject() {
        if (!this.projectFileHandle) {
            return;
        }
        try {
            const data = {
                graph: this.graph.serialize(),
                characterProfiles: Object.fromEntries(this.characterProfiles)
            };
            const writable = await (this.projectFileHandle as any).createWritable();
            await writable.write(JSON.stringify(data, null, 2));
            await writable.close();
            const status = document.getElementById("status");
            if (status) status.innerText = "项目已自动保存";
        } catch (err) {
            console.error("自动保存失败", err);
        }
    }

    private async getImageUrl(handle: FileSystemFileHandle | undefined): Promise<string> {
        if (!handle) return "";
        if (this.urlCache.has(handle.name)) return this.urlCache.get(handle.name)!;
        const file = await handle.getFile();
        const url = URL.createObjectURL(file);
        this.urlCache.set(handle.name, url);
        return url;
    }

    private async showProperties(node: any) {
        const panel = document.getElementById("prop-panel");
        const content = document.getElementById("prop-content");
        if (!panel || !content) return;
        panel.classList.remove('hidden');

        let framesHtml = "";
        
        // 渲染每一帧分镜
        for (let idx = 0; idx < node.properties.display.length; idx++) {
            const frame = node.properties.display[idx];
            
            // 选项背景图
            const frameSceneOpts = Array.from(this.sceneHandles.keys()).map(img => `<option value="${img}" ${frame.screen?.pic === img ? 'selected' : ''}>${img}</option>`).join("");
            const frameCharOpts = this.characterIds.map(id => `<option value="${id}" ${frame.dialog?.char === id ? 'selected' : ''}>${id}</option>`).join("");
            const pMap = this.portraitHandles.get(frame.dialog?.char || "") || new Map();
            const portraitOpts = Array.from(pMap.keys()).map(p => `<option value="${p}" ${frame.dialog?.portrait === p ? 'selected' : ''}>${p}</option>`).join("");

            // 缩略图预览
            const portraitUrl = await this.getImageUrl(pMap.get(frame.dialog?.portrait || ""));
            const sceneUrl = await this.getImageUrl(this.sceneHandles.get(frame.screen?.pic || ""));

            framesHtml += `
                <div class="frame-editor" style="border: 1px solid #333; padding: 12px; margin-bottom: 15px; border-radius: 8px; background: #222;">
                    <div style="display: flex; justify-content: space-between; margin-bottom: 10px;">
                        <span style="font-weight: bold; font-size: 0.8rem; color: #f1c40f;">第 ${idx + 1} 帧</span>
                        <button class="remove-frame" data-idx="${idx}" style="padding: 2px 6px; background: #c0392b; font-size: 0.7rem;">删除</button>
                    </div>
                    
                    <div class="prop-group">
                        <label>剧情文本 / 对话内容</label>
                        <textarea class="frame-text" data-idx="${idx}">${frame.dialog?.text || ""}</textarea>
                    </div>

                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin-top: 10px;">
                        <!-- 角色选择区域 -->
                        <div style="display: flex; flex-direction: column; gap: 8px;">
                            <div class="prop-group">
                                <label>出演角色 (ID)</label>
                                <select class="frame-char" data-idx="${idx}">
                                    <option value="">-- 请选择 --</option>
                                    ${frameCharOpts}
                                </select>
                            </div>
                            <div class="prop-group">
                                <label>角色立绘 / 表情</label>
                                <select class="frame-portrait" data-idx="${idx}">
                                    <option value="">-- 请选择 --</option>
                                    ${portraitOpts}
                                </select>
                            </div>
                            <div style="height: 100px; background: #111; border: 1px solid #333; border-radius: 4px; display: flex; align-items: center; justify-content: center; overflow: hidden;">
                                <img src="${portraitUrl}" style="max-height: 100%; max-width: 100%; display: ${portraitUrl ? 'block' : 'none'}; object-fit: contain;">
                                <span style="font-size:0.7rem; color:#444; display:${portraitUrl ? 'none' : 'block'}">暂无立绘</span>
                            </div>
                        </div>

                        <!-- 背景选择区域 -->
                        <div style="display: flex; flex-direction: column; gap: 8px;">
                            <div class="prop-group">
                                <label>当前场景 / 背景</label>
                                <select class="frame-pic" data-idx="${idx}">
                                    <option value="">-- 请选择 --</option>
                                    ${frameSceneOpts}
                                </select>
                            </div>
                            <div style="height: 145px; background: #111; border: 1px solid #333; border-radius: 4px; display: flex; align-items: center; justify-content: center; overflow: hidden;">
                                <img src="${sceneUrl}" style="max-height: 100%; max-width: 100%; display: ${sceneUrl ? 'block' : 'none'}; object-fit: cover;">
                                <span style="font-size:0.7rem; color:#444; display:${sceneUrl ? 'none' : 'block'}">暂无背景</span>
                            </div>
                        </div>
                    </div>
                </div>
            `;
        }

        content.innerHTML = `
            <div class="prop-group">
                <label>节点唯一 ID</label>
                <input type="text" value="${node.properties.id}" id="prop-id">
            </div>
            <div style="display: grid; gap: 15px; margin-bottom: 15px;">
                 <div class="prop-group" style="flex-direction: row; align-items: center; gap: 10px;">
                    <label>可重复触发</label>
                    <input type="checkbox" ${node.properties.repeatable ? "checked" : ""} id="prop-repeatable">
                </div>
                <div class="prop-group">
                    <label>触发优先级</label>
                    <input type="number" value="${node.properties.priority}" id="prop-priority" style="width: 60px;">
                </div>
            </div>
            <div class="secondary-header" style="display: flex; justify-content: space-between; align-items: center;">
                <span>剧情分镜帧</span>
                <button id="add-frame-btn" style="padding: 2px 10px; font-size: 0.7rem; background: #27ae60;">+ 新增分镜</button>
            </div>
            <div id="frames-container">${framesHtml}</div>
            <hr style="border: 0; border-top: 1px solid #333; margin: 15px 0;">
            <div class="prop-group">
                <label>JSON 扩展 (触发条件/挂载/卸载)</label>
                <textarea id="prop-extra" style="font-family: monospace; font-size: 0.75rem; min-height: 120px;">${JSON.stringify({
                    triggers: node.properties.triggers || [],
                    mount: node.properties.mount || [],
                    unMount: node.properties.unMount || []
                }, null, 2)}</textarea>
            </div>
            <div class="prop-group">
                <label>所属目录 / 章节</label>
                <input type="text" value="${node.properties.folder || "Root"}" id="prop-folder">
            </div>
        `;

        const syncToNode = () => {
            node.properties.id = (document.getElementById("prop-id") as HTMLInputElement).value;
            node.properties.folder = (document.getElementById("prop-folder") as HTMLInputElement).value || "Root";
            node.properties.repeatable = (document.getElementById("prop-repeatable") as HTMLInputElement).checked;
            node.properties.priority = parseInt((document.getElementById("prop-priority") as HTMLInputElement).value) || 0;

            document.querySelectorAll(".frame-editor").forEach((el, idx) => {
                const text = el.querySelector(".frame-text") as HTMLTextAreaElement;
                const char = el.querySelector(".frame-char") as HTMLSelectElement;
                const portrait = el.querySelector(".frame-portrait") as HTMLSelectElement;
                const pic = el.querySelector(".frame-pic") as HTMLSelectElement;
                if (node.properties.display[idx]) {
                    node.properties.display[idx].dialog.text = text.value;
                    node.properties.display[idx].dialog.char = char.value;
                    node.properties.display[idx].dialog.portrait = portrait.value;
                    node.properties.display[idx].screen.pic = pic.value;
                }
            });

            try {
                const extra = JSON.parse((document.getElementById("prop-extra") as HTMLTextAreaElement).value);
                node.properties.triggers = extra.triggers;
                node.properties.mount = extra.mount;
                node.properties.unMount = extra.unMount;
            } catch (e) {}

            node.setDirtyCanvas(true, true);
            this.refreshFileList();
            this.saveProject();
        };

        ["prop-id", "prop-folder", "prop-repeatable", "prop-priority", "prop-extra"].forEach(id => {
            const el = document.getElementById(id);
            el?.addEventListener("input", syncToNode);
            el?.addEventListener("change", syncToNode);
        });

        content.querySelectorAll(".frame-text, .frame-char, .frame-portrait, .frame-pic").forEach(el => {
            el.addEventListener("input", () => {
                syncToNode();
                // 只要这几个核心选框变了，就全量刷新面板以同步缩略图和下级列表
                if (el.classList.contains("frame-char") || 
                    el.classList.contains("frame-portrait") || 
                    el.classList.contains("frame-pic")) {
                    this.showProperties(node);
                }
            });
            el.addEventListener("change", () => {
                syncToNode();
                if (el.classList.contains("frame-char") || 
                    el.classList.contains("frame-portrait") || 
                    el.classList.contains("frame-pic")) {
                    this.showProperties(node);
                }
            });
        });

        document.getElementById("add-frame-btn")?.addEventListener("click", () => {
            const firstScene = Array.from(this.sceneHandles.keys())[0] || "";
            const firstChar = this.characterIds[0] || "";
            node.properties.display.push({
                screen: { pic: firstScene, text: "" },
                dialog: { char: firstChar, portrait: "", text: "New frame..." }
            });
            this.showProperties(node);
        });

        document.querySelectorAll(".remove-frame").forEach(btn => {
            btn.addEventListener("click", (e) => {
                const idx = parseInt((e.target as HTMLElement).getAttribute("data-idx")!);
                node.properties.display.splice(idx, 1);
                this.showProperties(node);
                syncToNode();
            });
        });
    }

    private hideProperties() {
        const panel = document.getElementById("prop-panel");
        if (panel) panel.classList.add('hidden');
    }

    private refreshFileList() {
        this.renderCharacterMetadata(); // 新增：在侧边栏渲染角色元数据

        const charListEl = document.getElementById("char-list");
        if (!charListEl) return;
        charListEl.innerHTML = "";
        const nodes = (this.graph as any)._nodes || [];
        const folderGroups: Map<string, any[]> = new Map();
        nodes.forEach((n: any) => {
            const folder = n.properties.folder || "Root";
            if (!folderGroups.has(folder)) folderGroups.set(folder, []);
            folderGroups.get(folder)?.push(n);
        });
        folderGroups.forEach((items, folderName) => {
            const group = document.createElement("div");
            group.className = "char-group";
            group.innerHTML = `
                <div class="char-item active" style="background: #2c3e50;">📁 ${folderName} (${items.length})</div>
                <div class="event-list active"></div>
            `;
            const listEl = group.querySelector(".event-list")!;
            items.forEach((node: any) => {
                const charId = node.properties.display?.[0]?.dialog?.char || "";
                const profile = this.characterProfiles.get(charId);
                const charName = profile ? profile.name : "?";
                
                const item = document.createElement("div");
                item.className = "event-item";
                item.innerText = `[${charName}] ${node.properties.id}`;
                item.onclick = (e) => {
                    e.stopPropagation();
                    this.canvas.centerOnNode(node);
                    this.showProperties(node);
                };
                listEl.appendChild(item);
            });
            charListEl.appendChild(group);
        });
        this.bindSidebarEvents();
    }

    private bindSidebarEvents() {
        document.querySelectorAll('.char-item').forEach(item => {
            item.addEventListener('click', (e) => {
                const target = e.currentTarget as HTMLElement;
                target.classList.toggle('active');
                target.nextElementSibling?.classList.toggle('active');
            });
        });
    }

    /**
     * 侧边栏：渲染角色元数据编辑器 (档案实例化)
     */
    private renderCharacterMetadata() {
        const header = document.querySelector(".secondary-header:nth-of-type(3)"); // Story Hierarchy 前面
        if (!header) return;

        // 查找或创建容器
        let container = document.getElementById("char-meta-container");
        if (!container) {
            container = document.createElement("div");
            container.id = "char-meta-container";
            container.style.padding = "10px";
            container.style.borderBottom = "1px solid #333";
            header.insertAdjacentElement('beforebegin', container);
            
            const metaHeader = document.createElement("div");
            metaHeader.className = "secondary-header";
            metaHeader.innerText = "全局角色管理 (实例化)";
            container.appendChild(metaHeader);
            
            const metaList = document.createElement("div");
            metaList.id = "char-meta-list";
            container.appendChild(metaList);
        }

        const listEl = document.getElementById("char-meta-list")!;
        listEl.innerHTML = "";
        
        this.characterIds.forEach(id => {
            const profile = this.characterProfiles.get(id);
            const item = document.createElement("div");
            item.style.marginBottom = "10px";
            item.style.fontSize = "0.75rem";
            item.innerHTML = `
                <div style="display: flex; justify-content: space-between; align-items: center; color: #f1c40f;">
                    <strong>ID: ${id}</strong>
                    <div style="display: flex; align-items: center; gap: 5px;">
                        <span style="font-size: 9px; opacity: 0.7;">主角</span>
                        <input type="checkbox" title="Protagonist" ${profile.isProtagonist ? "checked" : ""} class="char-is-hero" data-id="${id}">
                    </div>
                </div>
                <div class="prop-group" style="margin-top: 5px; display: flex; gap: 5px;">
                    <input type="text" value="${profile.name}" class="char-name-input" data-id="${id}" style="font-size: 11px; padding: 4px; flex: 1;" placeholder="姓名">
                    <button class="edit-profile-btn" data-id="${id}" style="padding: 2px 5px; font-size: 0.7rem; background: #8e44ad;">⚙️ 详细档案</button>
                </div>
            `;
            
            item.querySelector(".char-name-input")?.addEventListener("input", (e) => {
                profile.name = (e.target as HTMLInputElement).value;
                this.saveProject();
                this.refreshFileList();
            });
            item.querySelector(".char-is-hero")?.addEventListener("change", (e) => {
                profile.isProtagonist = (e.target as HTMLInputElement).checked;
                this.saveProject();
            });
            item.querySelector(".edit-profile-btn")?.addEventListener("click", () => {
                this.showCharacterProfile(id);
            });
            
            listEl.appendChild(item);
        });
    }

    /**
     * 弹出/渲染详细角色档案编辑器
     */
    private showCharacterProfile(id: string) {
        const profile = this.characterProfiles.get(id);
        if (!profile) return;

        // 复用属性面板展示角色详细信息
        const panel = document.getElementById("prop-panel");
        const content = document.getElementById("prop-content");
        if (!panel || !content) return;
        panel.classList.remove('hidden');

        // 整理 info 列表 HTML
        let infoHtml = "";
        (profile.info || []).forEach((item: any, idx: number) => {
            infoHtml += `
                <div class="info-editor" style="border: 1px solid #444; padding: 8px; margin-bottom: 8px; border-radius: 4px; background: #1a1a1a;">
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 5px;">
                        <span style="font-size: 0.7rem; color: #3498db;">传记 / 情报项 #${idx + 1}</span>
                        <div style="display: flex; align-items: center; gap: 5px;">
                             <span style="font-size: 9px; opacity: 0.6;">锁定</span>
                             <input type="checkbox" class="info-lock" data-idx="${idx}" ${item.lock ? "checked" : ""}>
                             <button class="remove-info" data-idx="${idx}" style="background: transparent; color: #c0392b; border: none; font-size: 0.9rem; cursor: pointer;">×</button>
                        </div>
                    </div>
                    <textarea class="info-text" data-idx="${idx}" style="font-size: 0.75rem; min-height: 40px; padding: 5px;">${item.text || ""}</textarea>
                    
                    <div style="margin-top: 5px;">
                        <label style="font-size: 9px; opacity: 0.5;">JSON 扩展 (自动解锁逻辑/条件)</label>
                        <textarea class="info-req" data-idx="${idx}" style="font-size: 0.7rem; font-family: monospace; min-height: 40px; background: #000; color: #27ae60; padding: 5px;">${JSON.stringify(item.unlockRequirement || [], null, 2)}</textarea>
                    </div>
                </div>
            `;
        });

        content.innerHTML = `
            <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 15px;">
                 <div style="width: 40px; height: 40px; background: #8e44ad; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: bold; font-size: 1.2rem;">${profile.name?.[0] || 'C'}</div>
                 <div>
                    <div style="font-weight: bold;">${profile.name}</div>
                    <div style="font-size: 0.7rem; opacity: 0.6;">详细档案编辑 - 核心 ID: ${id}</div>
                 </div>
            </div>

            <div class="prop-group">
                <label>角色全名 / 显示名称</label>
                <input type="text" value="${profile.name}" id="prof-name">
            </div>

            <div class="prop-group" style="display: flex; gap: 10px; align-items: center;">
                <div style="flex: 1;">
                   <label>初始好感度</label>
                   <input type="number" value="${profile.favor || 0}" id="prof-favor">
                </div>
                <div style="flex: 1;">
                   <label>是否为主角</label>
                   <input type="checkbox" id="prof-hero" ${profile.isProtagonist ? "checked" : ""}>
                </div>
            </div>

            <hr style="border: 0; border-top: 1px solid #333; margin: 15px 0;">

            <div class="secondary-header" style="display: flex; justify-content: space-between; align-items: center;">
                <span>角色传记 / 背景情报</span>
                <button id="add-info-btn" style="padding: 2px 8px; font-size: 0.7rem; background: #2980b9;">+ 情报卡</button>
            </div>
            
            <div id="info-list-container" style="margin-top: 10px;">
                ${infoHtml || '<div style="font-size: 0.7rem; opacity: 0.4; text-align: center; padding: 10px;">暂无传记项。</div>'}
            </div>
        `;

        // 绑定同步函数
        const syncProfile = () => {
            profile.name = (document.getElementById("prof-name") as HTMLInputElement).value;
            profile.favor = parseInt((document.getElementById("prof-favor") as HTMLInputElement).value) || 0;
            profile.isProtagonist = (document.getElementById("prof-hero") as HTMLInputElement).checked;
            
            const infoItems: any[] = [];
            content.querySelectorAll(".info-editor").forEach(el => {
                const text = (el.querySelector(".info-text") as HTMLTextAreaElement).value;
                const lock = (el.querySelector(".info-lock") as HTMLInputElement).checked;
                let req: any[] = [];
                try {
                    req = JSON.parse((el.querySelector(".info-req") as HTMLTextAreaElement).value);
                } catch(e) {}
                
                infoItems.push({ text, lock, unlockRequirement: req });
            });
            profile.info = infoItems;

            this.saveProject();
            this.refreshFileList();
        };

        // 绑定基本事件
        ["prof-name", "prof-favor", "prof-hero"].forEach(eid => {
            document.getElementById(eid)?.addEventListener("input", syncProfile);
            document.getElementById(eid)?.addEventListener("change", syncProfile);
        });

        content.querySelectorAll(".info-text, .info-lock, .info-req").forEach(el => {
            el.addEventListener("input", syncProfile);
            el.addEventListener("change", syncProfile);
        });

        // 绑定动态 UI 事件
        document.getElementById("add-info-btn")?.addEventListener("click", () => {
            if (!profile.info) profile.info = [];
            profile.info.push({ text: "New story/fact about this character...", lock: true });
            this.showCharacterProfile(id);
            this.saveProject();
        });

        content.querySelectorAll(".remove-info").forEach(btn => {
            btn.addEventListener("click", (e) => {
                const idx = parseInt((e.target as HTMLElement).getAttribute("data-idx")!);
                profile.info.splice(idx, 1);
                this.showCharacterProfile(id);
                this.saveProject();
            });
        });
    }

    public async publishBundle() {
        if (!this.directoryHandle) return alert("请先打开素材文件夹。");
        try {
            const result: { nodes: any[], characters: any[] } = { 
                nodes: [],
                characters: Array.from(this.characterProfiles.values()) // 包含导出的角色档案
            };
            const nodes = (this.graph as any)._nodes || [];
            nodes.forEach((node: any) => {
                result.nodes.push({
                    id: node.properties.id,
                    repeatable: node.properties.repeatable || false,
                    priority: node.properties.priority || 0,
                    display: node.properties.display.map((frame: any) => ({
                        screen: frame.screen,
                        dialog: {
                            char: frame.dialog.char,
                            text: frame.dialog.text,
                            pic: frame.dialog.portrait // 后端兼容 picMap，这里将 portrait 映射给 pic 字段
                        }
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
            const bundleHandle = await this.directoryHandle.getFileHandle("bundle_story.json", { create: true });
            const writable = await (bundleHandle as any).createWritable();
            await writable.write(JSON.stringify(result, null, 2));
            await writable.close();
            alert("发布成功！文件已保存至：bundle_story.json");
        } catch (err) { console.error(err); }
    }

    private bindEvents() {
        document.getElementById("save-btn")?.addEventListener("click", () => this.saveProject());
        document.getElementById("publish-btn")?.addEventListener("click", () => this.publishBundle());
        document.getElementById("open-dir-btn")?.addEventListener("click", () => this.selectDirectory());
        document.getElementById("new-folder-btn")?.addEventListener("click", () => {
            const name = prompt("Enter new folder name:", "New Chapter");
            if (name) alert(`Folder '${name}' logic added.`);
        });
        (this.graph as any).onNodeAdded = () => this.refreshFileList();
        (this.graph as any).onNodeRemoved = () => this.refreshFileList();
        document.getElementById("play-btn")?.addEventListener("click", async () => {
            await this.saveProject();
            window.open("/", "_blank");
        });
    }
}

document.addEventListener("DOMContentLoaded", () => { new ScriptEditor("#main-canvas"); });
