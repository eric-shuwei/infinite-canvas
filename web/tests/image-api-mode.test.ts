import assert from "node:assert/strict";

import { extractGeminiImageUrls, imageGenerationApiMode } from "../src/lib/image-api-mode.ts";

assert.equal(imageGenerationApiMode("gpt-image-2", "openai"), "openai", "GPT Image keeps using the OpenAI image endpoint");
assert.equal(imageGenerationApiMode("nano-banana-2.0", "openai"), "gemini", "Nano Banana uses the native Gemini endpoint");
assert.equal(imageGenerationApiMode("gemini-3.1-flash-image-preview", "openai"), "gemini", "Gemini image models use the native Gemini endpoint");
assert.equal(imageGenerationApiMode("imagen-4.0-generate-001", "openai"), "openai", "Imagen remains compatible with the OpenAI image endpoint adapter");
assert.equal(imageGenerationApiMode("gpt-image-2", "gemini"), "openai", "GPT Image keeps the OpenAI endpoint even when it shares a Gemini channel");
assert.equal(imageGenerationApiMode("seedream-4.0", "gemini"), "gemini", "Unknown image model families keep the configured channel protocol");

assert.deepEqual(
    extractGeminiImageUrls([{ inlineData: { mimeType: "image/png", data: "inline-image" } }, { file_data: { file_uri: "https://example.com/generated.png" } }, { text: "![image](data:image/jpeg;base64,markdown-image)" }, { text: "普通文字" }]),
    ["data:image/png;base64,inline-image", "https://example.com/generated.png", "data:image/jpeg;base64,markdown-image"],
    "Gemini image parsing supports native, snake-case, and Markdown responses",
);

console.log("image API mode tests passed");
