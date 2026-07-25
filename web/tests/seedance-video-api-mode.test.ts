import assert from "node:assert/strict";

import * as seedanceVideo from "../src/lib/seedance-video";

type SeedanceVideoApiMode = (config: { model: string; videoModel: string; baseUrl: string }) => "ark-plan" | "openai";
const seedanceVideoApiMode = (seedanceVideo as typeof seedanceVideo & { seedanceVideoApiMode?: SeedanceVideoApiMode }).seedanceVideoApiMode;

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

console.log("seedance video API mode tests passed");
