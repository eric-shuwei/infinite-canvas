import assert from "node:assert/strict";

import * as seedanceVideo from "../src/lib/seedance-video";
import type { ReferenceImage } from "../src/types/image";
import type { ReferenceAudio, ReferenceVideo } from "../src/types/media";

type SeedanceVideoApiMode = (config: { model: string; videoModel: string; baseUrl: string }) => "ark-plan" | "openai";
const seedanceVideoApiMode = (seedanceVideo as typeof seedanceVideo & { seedanceVideoApiMode?: SeedanceVideoApiMode }).seedanceVideoApiMode;
const image = { id: "image-1", name: "cat.png", type: "image/png", dataUrl: "data:image/png;base64,cat" } satisfies ReferenceImage;
const video = { id: "video-1", name: "camera.mp4", type: "video/mp4", url: "https://example.com/camera.mp4" } satisfies ReferenceVideo;
const audio = { id: "audio-1", name: "music.mp3", type: "audio/mpeg", url: "https://example.com/music.mp3" } satisfies ReferenceAudio;

assert.equal(typeof seedanceVideoApiMode, "function", "Seedance request protocol resolver is available");
assert.equal(
    seedanceVideoApiMode!({
        model: "seedance-2.0-mini-480p",
        videoModel: "",
        baseUrl: "https://token.offerya.cc",
    }),
    "openai",
    "Seedance models on an OpenAI-compatible gateway use /v1/videos",
);
assert.equal(
    seedanceVideoApiMode!({
        model: "seedance-2.0",
        videoModel: "",
        baseUrl: "https://ark.cn-beijing.volces.com/api/plan/v3",
    }),
    "ark-plan",
    "Ark Agent Plan Base URLs use the native Seedance task API",
);
assert.equal(seedanceVideo.buildSeedancePromptText("图片1 站起来，参考视频1的运镜和音频1的节奏。", [image], [video], [audio]), "参考素材编号：@image1、@video1、@audio1。\n\n@image1 站起来，参考@video1的运镜和@audio1的节奏。");

console.log("seedance video API mode tests passed");
