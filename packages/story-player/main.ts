import { Engine } from '@telltell/core';
import { FlatLayout } from './index';
import './index.css';

async function bootstrap() {
    console.log("Bootstraping TellTell Environment (Modularized)...");

    // 1. 初始化核心引擎
    const engine = new Engine();

    // 2. 初始化 UI 布局 (静态包引入)
    const layout = new FlatLayout(engine);
    await layout.mount();

    // 3. 启动引擎逻辑
    await engine.init();

    // Support for StartNode (from editor preview)
    const urlParams = new URLSearchParams(window.location.search);
    const startNodeId = urlParams.get('startNode');
    if (startNodeId) {
        console.log(`[Demo] Start play from specified node: ${startNodeId}`);
        await engine.startStoryNode(startNodeId);
    } else {
         // Default: wait for user interaction to start or handle first node auto-play if layout logic demands it
    }

    // 4. 暴露全局变量方便调试
    (window as any).game = {
        engine,
        characterManager: engine.getModule('CharacterManager'),
        mapManager: engine.getModule('MapManager'),
        phoneSystem: engine.getModule('PhoneSystem') || engine.getModule('mobile')
    };

    console.log("TellTell Game Engine Ready.");
}

bootstrap();
