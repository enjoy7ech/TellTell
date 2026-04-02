import { Engine } from './core/Engine';
import { PhoneSystem } from './plugins/PhoneSystem';
import { CharacterManager } from './core/CharacterManager';
import { MapManager } from './core/MapManager';

async function bootstrap() {
    console.log("Bootstraping TellTell Test Environment...");

    // 1. 实例化核心组件
    const characterManager = new CharacterManager();
    const mapManager = new MapManager();
    const phoneSystem = new PhoneSystem();

    // 2. 初始化引擎
    const engine = new Engine({
        storyUrl: '/config/story.json'
    });

    // 3. 注册模块到引擎
    engine.registerModule(characterManager);
    engine.registerModule(mapManager);
    engine.registerModule(phoneSystem);

    // 4. 加载基础数据 (模拟)
    characterManager.initCharacters([
        { id: 'aoi', name: 'Aoi', favor: 0, info: [{ text: 'Likes drawing', lock: true }] }
    ]);

    // 5. 启动引擎
    await engine.init();

    // 暴露到 window 方便控制台调试
    (window as any).game = {
        engine,
        characterManager,
        mapManager,
        phoneSystem
    };

    console.log("Game instances exposed to window.game for debugging.");
}

bootstrap();
