import assert from "node:assert/strict";

import { encodeChannelModel, filterModelsByCapability, modelMatchesCapability, withChannels, type AiConfig, type ModelChannel } from "../src/stores/use-config-store";

for (const model of ["nano-banana", "nano-banana-pro", "nano-banana2-1k", "nanobanana-pro"]) {
    assert.equal(modelMatchesCapability(model, "image"), true, `${model} is recognized as an image model`);
    assert.equal(modelMatchesCapability(model, "text"), false, `${model} is not classified as a text model`);
}

assert.equal(modelMatchesCapability("grok-video", "video"), true);
assert.equal(modelMatchesCapability("omni-fast", "video"), true);
assert.equal(modelMatchesCapability("omni-v2v-no-water", "video"), true);
assert.equal(modelMatchesCapability("gpt-5.5", "text"), true);

const channel: ModelChannel = {
    id: "default",
    name: "usetoken",
    baseUrl: "https://token.offerya.cc",
    apiKey: "",
    apiFormat: "openai",
    models: ["gpt-image-2", "nano-banana-pro-1k", "grok-video", "omni-v2v", "gpt-5.5", "gpt-4o-mini-tts"],
};
const option = (model: string) => encodeChannelModel(channel.id, model);
const allModels = channel.models.map(option);

assert.deepEqual(filterModelsByCapability(allModels, "image"), [option("gpt-image-2"), option("nano-banana-pro-1k")]);
assert.deepEqual(filterModelsByCapability(allModels, "video"), [option("grok-video"), option("omni-v2v")]);
assert.deepEqual(filterModelsByCapability(allModels, "text"), [option("gpt-5.5")]);
assert.deepEqual(filterModelsByCapability(allModels, "audio"), [option("gpt-4o-mini-tts")]);

const dirtyConfig = {
    channels: [channel],
    models: allModels,
    imageModels: [option("gpt-image-2"), option("grok-video")],
    videoModels: [option("grok-video"), option("gpt-image-2")],
    textModels: [option("gpt-5.5"), option("nano-banana-pro-1k")],
    audioModels: [option("gpt-4o-mini-tts"), option("omni-v2v")],
    imageModel: option("grok-video"),
    videoModel: option("gpt-image-2"),
    textModel: option("nano-banana-pro-1k"),
    audioModel: option("omni-v2v"),
} as AiConfig;
const cleanedConfig = withChannels(dirtyConfig, [channel]);

assert.deepEqual(cleanedConfig.imageModels, [option("gpt-image-2")]);
assert.deepEqual(cleanedConfig.videoModels, [option("grok-video")]);
assert.deepEqual(cleanedConfig.textModels, [option("gpt-5.5")]);
assert.deepEqual(cleanedConfig.audioModels, [option("gpt-4o-mini-tts")]);
assert.equal(cleanedConfig.imageModel, option("gpt-image-2"));
assert.equal(cleanedConfig.videoModel, option("grok-video"));
assert.equal(cleanedConfig.textModel, option("gpt-5.5"));
assert.equal(cleanedConfig.audioModel, option("gpt-4o-mini-tts"));

const mediaOnlyChannel = { ...channel, models: channel.models.filter((model) => model !== "gpt-5.5" && model !== "gpt-4o-mini-tts") };
const mediaOnlyConfig = withChannels(dirtyConfig, [mediaOnlyChannel]);
assert.deepEqual(mediaOnlyConfig.textModels, []);
assert.deepEqual(mediaOnlyConfig.audioModels, []);
assert.equal(mediaOnlyConfig.textModel, "");
assert.equal(mediaOnlyConfig.audioModel, "");

console.log("model capability tests passed");
