import assert from "node:assert/strict";

import { defaultConfig, encodeChannelModel, modelOptionLabel, type AiConfig } from "../src/stores/use-config-store";

const singleChannelModel = encodeChannelModel("default", "gpt-image-2");
assert.equal(modelOptionLabel(defaultConfig, singleChannelModel), "gpt-image-2", "single-channel model labels omit the channel name");

const multiChannelConfig: AiConfig = {
    ...defaultConfig,
    channels: [
        ...defaultConfig.channels,
        {
            id: "backup",
            name: "备用渠道",
            baseUrl: "https://example.com",
            apiKey: "",
            apiFormat: "openai",
            models: ["gpt-image-2"],
        },
    ],
};

assert.equal(modelOptionLabel(multiChannelConfig, singleChannelModel), "gpt-image-2（usetoken）", "multi-channel model labels include the channel name");
assert.equal(modelOptionLabel(multiChannelConfig, encodeChannelModel("backup", "gpt-image-2")), "gpt-image-2（备用渠道）", "duplicate models remain distinguishable");

console.log("model channel label tests passed");
