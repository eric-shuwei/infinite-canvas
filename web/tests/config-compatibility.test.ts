import assert from "node:assert/strict";

import { installBrowserStorageMock } from "./test-browser-env.ts";

installBrowserStorageMock();

const { createModelChannel, defaultConfig, encodeChannelModel, guessCapability, normalizeChannelModels, upsertChannelCredentials, withChannels } = await import("../src/stores/use-config-store.ts");

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

const updated = upsertChannelCredentials(importedConfig, { baseUrl: "https://token.offerya.cc/v1", apiKey: "test-import-key" });
assert.equal(updated.channelId, importedChannel.id, "credential updates identify the existing channel for model loading");
assert.equal(updated.config.channels.length, 1, "a version-suffixed Base URL updates the existing channel");
assert.deepEqual(updated.config.channels[0].models, importedChannel.models, "credential updates preserve configured models");
const added = upsertChannelCredentials(importedConfig, { baseUrl: "https://example.com", apiKey: "test-import-key" });
assert.equal(added.channelId, added.config.channels[1].id, "new imports identify only the newly created channel");
assert.equal(added.config.channels[0], importedChannel, "new imports preserve the existing channel");

console.log("config compatibility tests passed");
