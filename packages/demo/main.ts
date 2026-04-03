import { Engine } from '@telltell/core';
import { FlatLayout } from '@telltell/layout-flat';
import '@telltell/layout-flat/index.css'
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
