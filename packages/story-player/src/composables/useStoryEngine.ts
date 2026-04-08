import { reactive, ref, onMounted } from 'vue';

/**
 * 核心：解析资产路径，剔除多余前缀
 */
export const resolveAssetPath = (path: string) => {
    if (!path) return '';
    return path.replace(/^assets\//, '').replace(/^\/assets\//, '');
};

export function useStoryEngine(engine: any) {
    const isInitialized = ref(false);
    
    // 核心剧情帧状态 (已扁平化，确保最高响应式感知度)
    const frame = reactive({
        id: '',
        name: '',
        text: '',
        screenPic: '',
        screenText: '',
        characters: [] as string[],
        look: {} as Record<string, string>,
        choices: [] as any[]
    });

    /**
     * 将引擎抛出的 newFrame 同步到响应式 frame 对象中
     */
    const syncFrame = (newFrame: any) => {
        const currentNodeId = engine.currentNode?.id;
        console.log("[StoryEngine] Syncing Frame:", currentNodeId);
        
        frame.id = currentNodeId || '';
        frame.text = newFrame.dialog?.text || "";
        frame.name = newFrame.dialog ? engine.getCharacterName(newFrame.dialog.char) : "";
        
        // 人物逻辑处理
        if (newFrame.dialog?.char && newFrame.dialog?.pic) {
            frame.look[newFrame.dialog.char] = newFrame.dialog.pic;
            if (!frame.characters.includes(newFrame.dialog.char)) {
                frame.characters.push(newFrame.dialog.char);
            }
        }
        if (newFrame.look) {
            // 合并多角色立绘
            frame.look = { ...frame.look, ...newFrame.look };
            frame.characters = Object.keys(frame.look);
        } else if (!newFrame.dialog?.char) {
            // 如果既无 Look 又无当前说话人，清空立绘层 (场景转场逻辑)
            frame.characters = [];
        }

        // 场景逻辑处理
        if (newFrame.screen) {
            frame.screenPic = resolveAssetPath(newFrame.screen.pic || "");
            frame.screenText = newFrame.screen.text || "";
        }

        frame.choices = newFrame.choice || [];
    };

    onMounted(async () => {
        // 1. 处理初始化竞争条件
        if (engine.isInitialized) {
            isInitialized.value = true;
        }
        engine.on('initialized', () => {
            isInitialized.value = true;
        });

        // 2. 核心：主动追回可能错过的第一帧
        if (engine.currentNode && engine.currentFrame) {
            syncFrame(engine.currentFrame);
        }

        // 3. 监听后续渲染事件
        engine.on('render', (newFrame: any) => {
            syncFrame(newFrame);
        });

        // 4. 安全唤醒 (兜底)
        setTimeout(() => {
            if (!isInitialized.value) isInitialized.value = true;
        }, 1500);
    });

    return {
        frame,
        isInitialized,
        syncFrame
    };
}
