import assert from "node:assert/strict";

import { installBrowserStorageMock } from "./test-browser-env.ts";

type AiConfig = import("../src/stores/use-config-store.ts").AiConfig;

installBrowserStorageMock();

const { formatModelPrice, resolveModelPricing } = await import("../src/lib/model-pricing.ts");
const { defaultConfig, encodeChannelModel } = await import("../src/stores/use-config-store.ts");

assert.equal(formatModelPrice({ model_name: "gpt-image-2", quota_type: 1, model_price: 0.15 }, "image"), "¥0.15/张", "fixed image prices use per-image units");
assert.equal(formatModelPrice({ model_name: "grok-video", quota_type: 1, model_price: 0.35 }, "video"), "¥0.35/秒", "fixed video prices use per-second units");
assert.equal(formatModelPrice({ model_name: "gpt-image-2", quota_type: 1, model_price: 5, billing_mode: "tiered_expr", billing_expr: "tiered" }, "image"), "动态计费", "dynamic pricing is not presented as a misleading fixed price");
assert.equal(formatModelPrice({ model_name: "gpt-5.5", quota_type: 0, model_price: 0 }, "text"), "", "token-based prices are omitted from compact selectors");

const multiChannelConfig: AiConfig = {
    ...defaultConfig,
    channels: [
        { id: "primary", name: "primary", baseUrl: "https://vip-api.example.com", apiKey: "", apiFormat: "openai", models: [{ name: "gpt-image-2", capability: "image" }] },
        { id: "secondary", name: "usetoken", baseUrl: "https://token.offerya.cc", apiKey: "", apiFormat: "openai", models: [{ name: "gpt-image-2", capability: "image" }] },
    ],
};
const channelPricing = {
    primary: { "gpt-image-2": { model_name: "gpt-image-2", quota_type: 1, model_price: 0.08 } },
    secondary: { "gpt-image-2": { model_name: "gpt-image-2", quota_type: 1, model_price: 0.15 } },
};

assert.equal(resolveModelPricing(multiChannelConfig, encodeChannelModel("primary", "gpt-image-2"), channelPricing)?.model_price, 0.08, "pricing is resolved from the selected channel");
assert.equal(resolveModelPricing(multiChannelConfig, encodeChannelModel("secondary", "gpt-image-2"), channelPricing)?.model_price, 0.15, "same-name models keep separate channel prices");

console.log("model pricing tests passed");
