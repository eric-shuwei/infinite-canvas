export type ImageGenerationApiMode = "openai" | "gemini";

type GeminiImagePart = {
    text?: string;
    inlineData?: { mimeType?: string; data?: string };
    inline_data?: { mime_type?: string; mimeType?: string; data?: string };
    fileData?: { fileUri?: string };
    file_data?: { file_uri?: string; fileUri?: string };
};

const DATA_IMAGE_URL_PATTERN = /data:image\/[a-z0-9.+-]+;base64,[a-z0-9+/_=-]+/gi;
const MARKDOWN_IMAGE_URL_PATTERN = /!\[[^\]]*\]\((https?:\/\/[^\s)]+)\)/gi;

// A relay channel may expose models from both wire protocols, so image model names take precedence over the channel default.
export function imageGenerationApiMode(model: string, apiFormat: ImageGenerationApiMode): ImageGenerationApiMode {
    const value = model.trim().toLowerCase();
    if (isNativeGeminiImageModel(value)) return "gemini";
    if (isOpenAiImageModel(value)) return "openai";
    return apiFormat;
}

export function extractGeminiImageUrls(parts: GeminiImagePart[]) {
    const urls: string[] = [];
    const add = (value?: string) => {
        const url = value?.trim();
        if (url && !urls.includes(url)) urls.push(url);
    };

    parts.forEach((part) => {
        const inlineData = part.inlineData || (part.inline_data ? { mimeType: part.inline_data.mimeType || part.inline_data.mime_type, data: part.inline_data.data } : undefined);
        if (inlineData?.data) add(`data:${inlineData.mimeType || "image/png"};base64,${inlineData.data}`);
        add(part.fileData?.fileUri);
        add(part.file_data?.fileUri || part.file_data?.file_uri);
        for (const match of part.text?.matchAll(DATA_IMAGE_URL_PATTERN) || []) add(match[0]);
        for (const match of part.text?.matchAll(MARKDOWN_IMAGE_URL_PATTERN) || []) add(match[1]);
    });

    return urls;
}

function isNativeGeminiImageModel(model: string) {
    return model.includes("nano-banana") || model.includes("nanobanana") || (model.startsWith("gemini-") && model.includes("-image"));
}

function isOpenAiImageModel(model: string) {
    return ["gpt-image", "dall-e", "dalle", "imagen", "flux", "sdxl", "stable-diffusion", "midjourney", "seedream"].some((name) => model.includes(name));
}
