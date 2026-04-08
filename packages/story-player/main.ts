import { createApp } from 'vue';
import { Engine } from '@telltell/core';
import App from './App.vue';
import './index.css';

async function bootstrap() {
    console.log("[StoryPlayer] Initializing Standalone Narrative Entry...");

    // 1. 初始化核心引擎
    const engine = new Engine();

    // 2. 启动引擎逻辑
    await engine.init();

    // 3. 直接挂载 Vue 应用 (取代已删除的 FlatLayout)
    const container = document.querySelector('#app-layout');
    if (!container) {
        console.error("[StoryPlayer] CRITICAL: #app-layout container not found in index.html!");
    } else {
        console.log("[StoryPlayer] Found #app-layout, mounting Vue app...");
    }

    const app = createApp(App, {
        engine: engine
    });
    
    app.mount('#app-layout');

    // 4. 处理编辑器预览跳转 (Support for StartNode)
    const urlParams = new URLSearchParams(window.location.search);
    const startNodeId = urlParams.get('startNode');
    if (startNodeId) {
        console.log(`[StoryPlayer] Jumping to specify node: ${startNodeId}`);
        await engine.startStoryNode(startNodeId);
        await engine.next(); // 强制激活预览的第一帧
    }

    // 5. 暴露全局变量调试
    (window as any).game = {
        engine,
        characterManager: engine.getModule('CharacterManager'),
        phoneSystem: engine.getModule('mobile')
    };

    console.log("[StoryPlayer] Engine & UI Ready.");
}

bootstrap();
