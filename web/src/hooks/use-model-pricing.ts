import { useQueries } from "@tanstack/react-query";

import { pricingMap, type ChannelPricingMap, type ModelPricing } from "@/lib/model-pricing";
import type { AiConfig } from "@/stores/use-config-store";

type PricingResponse = {
    success?: boolean;
    data?: ModelPricing[];
};

export function useModelPricing(config: Pick<AiConfig, "channels">) {
    const channels = config.channels.filter((channel) => channel.apiFormat === "openai" && channel.baseUrl.trim());
    return useQueries({
        queries: channels.map((channel) => ({
            queryKey: ["model-pricing", channel.id, channel.baseUrl.trim()],
            queryFn: () => fetchChannelPricing(channel.baseUrl),
            staleTime: 5 * 60_000,
        })),
        combine: (results) => ({
            data: Object.fromEntries(channels.map((channel, index) => [channel.id, results[index]?.data || {}])) as ChannelPricingMap,
        }),
    });
}

async function fetchChannelPricing(baseUrl: string) {
    try {
        const response = await fetch(pricingUrl(baseUrl), { signal: AbortSignal.timeout(5_000) });
        if (!response.ok) return {};
        const payload = (await response.json()) as PricingResponse | ModelPricing[];
        const items = Array.isArray(payload) ? payload : Array.isArray(payload.data) ? payload.data : [];
        return pricingMap(items);
    } catch {
        return {};
    }
}

function pricingUrl(baseUrl: string) {
    const url = new URL(baseUrl.trim());
    if (url.hostname === "token.offerya.cc") return "/api/pricing";
    url.pathname = `${stripApiSuffix(url.pathname)}/api/pricing`.replace(/\/+/g, "/");
    url.search = "";
    url.hash = "";
    return url.toString();
}

function stripApiSuffix(pathname: string) {
    const path = pathname.replace(/\/+$/, "");
    return path.replace(/\/(?:v1|api\/v3|api\/plan\/v3)$/i, "");
}
