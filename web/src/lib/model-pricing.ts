import { modelOptionName, resolveModelChannel, type AiConfig, type ModelCapability } from "@/stores/use-config-store";

export type ModelPricing = {
    model_name: string;
    description?: string;
    quota_type: number;
    model_price: number;
    billing_mode?: string;
    billing_expr?: string;
};

export type ModelPricingMap = Record<string, ModelPricing>;
export type ChannelPricingMap = Record<string, ModelPricingMap>;

export function formatModelPrice(model: ModelPricing | undefined, capability?: ModelCapability) {
    if (!model || model.quota_type !== 1) return "";
    if (model.billing_mode === "tiered_expr" || model.billing_expr?.trim()) return "动态计费";
    if (!Number.isFinite(model.model_price) || model.model_price <= 0) return "";
    const unit = capability === "image" ? "/张" : capability === "video" ? "/秒" : capability === "audio" ? "/次" : "/次";
    return `¥${formatPriceNumber(model.model_price)}${unit}`;
}

export function resolveModelPricing(config: AiConfig, value: string, pricing: ChannelPricingMap) {
    const channel = resolveModelChannel(config, value);
    return pricing[channel.id]?.[modelOptionName(value)];
}

export function pricingMap(items: ModelPricing[]) {
    return Object.fromEntries(items.map((item) => [item.model_name, item]));
}

function formatPriceNumber(value: number) {
    return value.toFixed(value < 0.01 ? 4 : value < 1 ? 3 : 2).replace(/\.?0+$/, "");
}
