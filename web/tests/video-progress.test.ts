import assert from "node:assert/strict";
import axios from "axios";

import * as videoApi from "../src/services/api/video";
import { defaultConfig, encodeChannelModel, type ModelChannel } from "../src/stores/use-config-store";

type NormalizeVideoProgress = (value: unknown) => number | undefined;
const normalizeVideoProgress = (videoApi as typeof videoApi & { normalizeVideoProgress?: NormalizeVideoProgress }).normalizeVideoProgress;

assert.equal(typeof normalizeVideoProgress, "function", "video progress normalizer is available");
assert.equal(normalizeVideoProgress!("50%"), 50);
assert.equal(normalizeVideoProgress!(30), 30);
assert.equal(normalizeVideoProgress!(120), 100);
assert.equal(normalizeVideoProgress!(-10), 0);
assert.equal(normalizeVideoProgress!("unknown"), undefined);

const channel: ModelChannel = {
    id: "default",
    name: "usetoken",
    baseUrl: "https://token.offerya.cc",
    apiKey: "test-key",
    apiFormat: "openai",
    models: ["seedance-2.0-mini-480p"],
};
const model = encodeChannelModel(channel.id, channel.models[0]);
const config = {
    ...defaultConfig,
    baseUrl: channel.baseUrl,
    apiKey: channel.apiKey,
    channels: [channel],
    model,
    videoModel: model,
    videoModels: [model],
    models: [model],
};
const originalPost = axios.post;
let requestUrl = "";
let requestBody: Record<string, unknown> | undefined;
axios.post = (async (url: string, body: Record<string, unknown>) => {
    requestUrl = url;
    requestBody = body;
    return { data: { id: "task-1", status: "queued", progress: 0 } };
}) as typeof axios.post;
try {
    await videoApi.createVideoGenerationTask(config, "图片1 站起来向前走。", [{ id: "image-1", name: "cat.png", type: "image/png", dataUrl: "data:image/png;base64,cat" }]);
} finally {
    axios.post = originalPost;
}

assert.equal(requestUrl, "https://token.offerya.cc/v1/videos");
assert.equal(requestBody?.image, "data:image/png;base64,cat", "single-image Seedance requests use the documented image field");
assert.equal(requestBody?.prompt, "参考素材编号：@image1。\n\n@image1 站起来向前走。");
assert.equal((requestBody?.metadata as { content?: unknown[] } | undefined)?.content, undefined, "single-image requests do not duplicate the source inside metadata.content");

console.log("video progress tests passed");
