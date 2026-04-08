import { GoogleGenAI } from "@google/genai";

export class GeminiService {
    private client: any = null;
    private currentModel: string = "gemini-1.5-flash-latest";
    private imageModel: string = "gemini-1.5-flash-latest";

    constructor(apiKey: string, modelName: string = "gemini-1.5-flash-latest", imageModel: string = "gemini-1.5-flash-latest") {
        if (apiKey) {
            this.currentModel = modelName;
            this.imageModel = imageModel;
            // The @google/genai client uses an object for config
            this.client = new GoogleGenAI({ apiKey });
        }
    }

    public updateTextModel(modelName: string) {
        this.currentModel = modelName;
        console.log(`[Gemini] Switched Text Model to: ${modelName}`);
    }

    public updateImageModel(modelName: string) {
        this.imageModel = modelName;
        console.log(`[Gemini] Switched Image Model to: ${modelName}`);
    }

    public async listModels() {
        if (!this.client) return [];
        try {
            const list: any[] = [];
            const response = await this.client.models.list();
            if (response && response.models) {
                list.push(...response.models);
            } else if (response && typeof response[Symbol.asyncIterator] === 'function') {
                for await (const m of response) { list.push(m); }
            }
            return list;
        } catch (e) { return []; }
    }

    private getCommonConfig() {
        return {
            temperature: Number(localStorage.getItem('ai_temperature')) || 0.9,
            topP: Number(localStorage.getItem('ai_top_p')) || 0.95,
            maxOutputTokens: 1024
        };
    }

    public async generateDialog(context: { charName: string, plot: string, lastDialogs: string[], userDraft?: string }) {
        if (!this.client) return "请配置 API Key";
        
        let draftContext = "";
        if (context.userDraft && context.userDraft.trim()) {
            draftContext = `\n用户当前已输入的草稿内容为: "${context.userDraft.trim()}"。请基于此草稿进行续写、补全或优化。`;
        }

        const writingStyle = localStorage.getItem('ai_writing_style') || "";
        const styleContext = writingStyle ? `\n文笔要求：${writingStyle}。` : "";

        const prompt = `你是一个专业的二次元文字冒险游戏剧本作家。当前角色: ${context.charName}。背景: ${context.plot}。${styleContext}\n对话记录: \n${context.lastDialogs.join('\n')}\n${draftContext}\n要求：只返回台词正文。`;
        try {
            const result = await this.client.models.generateContent({
                model: this.currentModel,
                contents: [{ role: 'user', parts: [{ text: prompt }] }],
                config: this.getCommonConfig()
            });
            return result.text.trim().replace(/^"|"$/g, '');
        } catch (e: any) { return `生成失败: ${e.message}`; }
    }

    public async suggestTags(plot: string) {
        if (!this.client) return [];
        const prompt = `分析以下剧情，提取 3-5 个逗号分隔的关键词：\n${plot}`;
        try {
            const result = await this.client.models.generateContent({
                model: this.currentModel,
                contents: [{ role: 'user', parts: [{ text: prompt }] }],
                config: this.getCommonConfig()
            });
            return result.text.split(',').map((t: string) => t.trim());
        } catch (e) { return []; }
    }

    public async generateCharacterSoul(charName: string) {
        if (!this.client) return "请配置 API Key";
        const prompt = `请为角色 "${charName}" 编写一段描述人设核心的灵魂描写。约 100-200 字。`;
        try {
            const result = await this.client.models.generateContent({
                model: this.currentModel,
                contents: [{ role: 'user', parts: [{ text: prompt }] }],
                config: this.getCommonConfig()
            });
            return result.text.trim();
        } catch (e: any) { return `生成失败: ${e.message}`; }
    }

    public async generateBiography(charName: string, soul: string) {
        if (!this.client) return "请配置 API Key";
        const prompt = `结合角色 "${charName}" 的灵魂描写：\n${soul}\n\n请生成一个深刻的传记条目。要求：语言生动，只返回条目正文。`;
        try {
            const result = await this.client.models.generateContent({
                model: this.currentModel,
                contents: [{ role: 'user', parts: [{ text: prompt }] }],
                config: this.getCommonConfig()
            });
            return result.text.trim();
        } catch (e: any) { return `生成失败: ${e.message}`; }
    }

    public async generatePortrait(userPrompt: string, referenceImage?: string) {
        if (!this.client) return { error: "请先配置 API Key" };
        
        const artStyle = localStorage.getItem('ai_art_style') || "";
        const stylePrefix = artStyle ? `风格描述：${artStyle}。` : "";
        
        const finalPrompt = `${stylePrefix}${userPrompt}。要求生成人物半身照，宽度比例限制在 200 像素左右。背景为统一的纯绿色 (#00FF00)，纵横比为 9:16。`;
        try {
            if (this.imageModel.includes('gemini') || this.imageModel.includes('banana')) {
                let refBase64 = "";
                if (referenceImage) {
                    try {
                        const res = await fetch(referenceImage);
                        const blob = await res.blob();
                        refBase64 = await new Promise((resolve) => {
                            const reader = new FileReader();
                            reader.onloadend = () => resolve((reader.result as string).split(',')[1]);
                            reader.readAsDataURL(blob);
                        });
                    } catch (e) { console.warn("Ref image fetch failed", e); }
                }

                const result = await this.client.models.generateContent({
                    model: this.imageModel,
                    contents: [{
                        role: 'user',
                        parts: [
                            { text: finalPrompt },
                            ...(refBase64 ? [{ inlineData: { data: refBase64, mimeType: 'image/webp' } }] : [])
                        ]
                    }],
                    config: this.getCommonConfig()
                });

                // Extract image from parts (Handle candidate directly from REST-style output of @google/genai)
                const candidate = result.candidates?.[0] || result.response?.candidates?.[0];
                const imagePart = candidate?.content?.parts?.find((p: any) => p.inlineData);
                if (imagePart) {
                    return { base64: imagePart.inlineData.data, url: `data:${imagePart.inlineData.mimeType || 'image/png'};base64,${imagePart.inlineData.data}` };
                }
            } else {
                const result = await this.client.models.generateImages({
                    model: this.imageModel,
                    prompt: finalPrompt,
                    parameters: { number_of_images: 1, aspect_ratio: "9:16" }
                });
                const img = result.images?.[0];
                if (img) return { url: img.url || `data:image/png;base64,${img.base64}`, base64: img.base64 };
            }
            return { error: "未生成图片数据" };
        } catch (e: any) { return { error: `生成失败: ${e.message}` }; }
    }
}
