import assert from "node:assert/strict";

import { installBrowserStorageMock } from "./test-browser-env.ts";

installBrowserStorageMock();

const { createModelChannel, defaultConfig, encodeChannelModel, guessCapability, normalizeChannelModels, withChannels } = await import("../src/stores/use-config-store.ts");

assert.equal(defaultConfig.baseUrl, "https://token.offerya.cc", "new installations use the production UseToken gateway");
assert.equal(defaultConfig.channels[0]?.baseUrl, "https://token.offerya.cc", "the default channel uses the production UseToken gateway");
assert.equal(guessCapability("nano-banana-2.0"), "image", "Nano Banana is assigned to image capability during old-config migration");

const normalized = normalizeChannelModels(["nano-banana-2.0", "gpt-5.5"]);
assert.deepEqual(
    normalized.map((model) => [model.name, model.capability]),
    [
        ["nano-banana-2.0", "image"],
        ["gpt-5.5", "text"],
    ],
    "legacy string model lists migrate to the official ChannelModel format",
);

const importedChannel = createModelChannel({ id: "imported", baseUrl: "https://token.offerya.cc", models: normalized });
const importedConfig = withChannels(defaultConfig, [importedChannel]);
assert.equal(importedConfig.imageModel, encodeChannelModel("imported", "nano-banana-2.0"), "imported channels select an available image model");
assert.equal(importedConfig.textModel, encodeChannelModel("imported", "gpt-5.5"), "imported channels select an available text model");

console.log("config compatibility tests passed");
