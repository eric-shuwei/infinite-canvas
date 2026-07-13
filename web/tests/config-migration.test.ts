import assert from "node:assert/strict";

import * as configStore from "../src/stores/use-config-store";

type MigratePersistedConfig = (config: configStore.AiConfig) => configStore.AiConfig;
const migratePersistedConfig = (configStore as typeof configStore & { migratePersistedConfig?: MigratePersistedConfig }).migratePersistedConfig;

assert.equal(typeof migratePersistedConfig, "function", "persisted config migration is available");

const migrated = migratePersistedConfig!({
    ...configStore.defaultConfig,
    baseUrl: "https://api.openai.com",
    channels: [
        {
            id: "default",
            name: "默认渠道",
            baseUrl: "https://api.openai.com",
            apiKey: "",
            apiFormat: "openai",
            models: ["gpt-image-2"],
        },
        {
            id: "custom",
            name: "自定义渠道",
            baseUrl: "https://example.com",
            apiKey: "",
            apiFormat: "openai",
            models: ["custom-model"],
        },
    ],
});

assert.equal(migrated.baseUrl, "https://token.offerya.cc", "legacy root Base URL is migrated");
assert.equal(migrated.channels[0]?.baseUrl, "https://token.offerya.cc", "legacy default channel Base URL is migrated");
assert.equal(migrated.channels[0]?.name, "usetoken", "legacy default channel name is migrated");
assert.equal(migrated.channels[1]?.baseUrl, "https://example.com", "custom Base URL is preserved");
assert.equal(migrated.channels[1]?.name, "自定义渠道", "custom channel name is preserved");

const customOpenAi = migratePersistedConfig!({
    ...configStore.defaultConfig,
    baseUrl: "https://api.openai.com",
    channels: [
        {
            id: "default",
            name: "官方 OpenAI",
            baseUrl: "https://api.openai.com",
            apiKey: "",
            apiFormat: "openai",
            models: ["gpt-5.5"],
        },
    ],
});

assert.equal(customOpenAi.baseUrl, "https://api.openai.com", "custom root OpenAI Base URL is preserved");
assert.equal(customOpenAi.channels[0]?.baseUrl, "https://api.openai.com", "custom default channel OpenAI Base URL is preserved");
assert.equal(customOpenAi.channels[0]?.name, "官方 OpenAI", "custom default channel name is preserved");

console.log("config migration tests passed");
