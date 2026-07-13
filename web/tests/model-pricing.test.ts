import assert from "node:assert/strict";

import * as modelPricing from "../src/lib/model-pricing";
import { defaultConfig, encodeChannelModel, type AiConfig } from "../src/stores/use-config-store";

type PricingModel = {
    model_name: string;
    description?: string;
    quota_type: number;
    model_price: number;
    billing_mode?: string;
    billing_expr?: string;
};

type FormatModelPrice = (model: PricingModel | undefined, capability?: "image" | "video" | "text" | "audio") => string;
const formatModelPrice = (modelPricing as typeof modelPricing & { formatModelPrice?: FormatModelPrice }).formatModelPrice;

assert.equal(typeof formatModelPrice, "function", "model price formatter is available");
assert.equal(formatModelPrice!({ model_name: "gpt-image-2-4k", quota_type: 1, model_price: 0.15 }, "image"), "¥0.15/张", "fixed image prices use per-image units");
assert.equal(formatModelPrice!({ model_name: "grok-video", quota_type: 1, model_price: 0.35 }, "video"), "¥0.35/秒", "fixed video prices use per-second units");
assert.equal(formatModelPrice!({ model_name: "gpt-image-2", quota_type: 1, model_price: 5, billing_mode: "tiered_expr", billing_expr: "tiered" }, "image"), "动态计费", "dynamic pricing is not presented as a misleading fixed price");
assert.equal(formatModelPrice!({ model_name: "gpt-5.5", quota_type: 0, model_price: 0 }, "text"), "", "token-based prices are omitted from compact selectors");
assert.equal(formatModelPrice!(undefined, "image"), "", "missing pricing metadata has no label");

const multiChannelConfig: AiConfig = {
    ...defaultConfig,
    channels: [
        { id: "primary", name: "cangyuan", baseUrl: "https://vip-api.example.com", apiKey: "", apiFormat: "openai", models: ["gpt-image-2"] },
        { id: "secondary", name: "usetoken", baseUrl: "https://token.offerya.cc", apiKey: "", apiFormat: "openai", models: ["gpt-image-2"] },
    ],
};
const channelPricing = {
    primary: {
        "gpt-image-2": { model_name: "gpt-image-2", quota_type: 1, model_price: 0.08 },
    },
    secondary: {
        "gpt-image-2": { model_name: "gpt-image-2", quota_type: 1, model_price: 0.15 },
    },
};

assert.equal(modelPricing.resolveModelPricing(multiChannelConfig, encodeChannelModel("primary", "gpt-image-2"), channelPricing)?.model_price, 0.08, "pricing is resolved from the selected channel");
assert.equal(modelPricing.resolveModelPricing(multiChannelConfig, encodeChannelModel("secondary", "gpt-image-2"), channelPricing)?.model_price, 0.15, "same-name models keep separate channel prices");

console.log("model pricing tests passed");
