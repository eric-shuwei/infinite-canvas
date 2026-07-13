import type { ReactNode } from "react";
import { useEffect, useRef } from "react";
import { App } from "antd";

import { fetchChannelModels } from "@/services/api/image";
import { createModelChannel, useConfigStore, withChannels } from "@/stores/use-config-store";

export function ClientRootInit({ children }: { children: ReactNode }) {
    const { message } = App.useApp();
    const handledConfigParams = useRef(false);
    const updateConfig = useConfigStore((state) => state.updateConfig);
    const config = useConfigStore((state) => state.config);
    const openConfigDialog = useConfigStore((state) => state.openConfigDialog);

    useEffect(() => {
        if (handledConfigParams.current) return;
        const searchParams = new URLSearchParams(window.location.search);
        const baseUrl = searchParams.get("baseUrl") || searchParams.get("baseurl");
        const apiKey = searchParams.get("apiKey") || searchParams.get("apikey");
        const apiKeys = parseImportedApiKeys(searchParams.get("apiKeys"));
        if (!baseUrl && !apiKey && !apiKeys.length) return;
        handledConfigParams.current = true;
        searchParams.delete("baseUrl");
        searchParams.delete("baseurl");
        searchParams.delete("apiKey");
        searchParams.delete("apikey");
        searchParams.delete("apiKeys");
        window.history.replaceState(null, "", `${window.location.pathname}${searchParams.size ? `?${searchParams}` : ""}${window.location.hash}`);
        const firstChannel = config.channels[0];
        const importedChannels = apiKeys.length
            ? apiKeys.map((item, index) =>
                  createModelChannel({
                      id: `imported-${index + 1}`,
                      name: item.name,
                      baseUrl: baseUrl || undefined,
                      apiKey: item.apiKey,
                  }),
              )
            : firstChannel
            ? config.channels.map((channel, index) =>
                  index === 0
                      ? {
                            ...channel,
                            ...(baseUrl ? { baseUrl } : {}),
                            ...(apiKey ? { apiKey } : {}),
                      }
                      : channel,
              )
            : [createModelChannel({ id: "default", name: "usetoken", baseUrl: baseUrl || undefined, apiKey: apiKey || "" })];
        const importedChannelsToFetch = apiKeys.length ? importedChannels : importedChannels.slice(0, 1);
        updateConfig("channels", importedChannels);
        if (baseUrl) updateConfig("baseUrl", baseUrl);
        if (apiKey) updateConfig("apiKey", apiKey);
        openConfigDialog(false);
        if (!importedChannelsToFetch.some((channel) => channel.baseUrl.trim() && channel.apiKey.trim())) {
            message.success("已导入本地直连配置");
            return;
        }
        void Promise.allSettled(
            importedChannelsToFetch.map(async (channel) => [channel.id, await fetchChannelModels(channel)] as const),
        ).then((results) => {
            const entries = results.flatMap((result) => (result.status === "fulfilled" ? [result.value] : []));
            const failures = results.filter((result) => result.status === "rejected");
            if (entries.length) {
                const currentConfig = useConfigStore.getState().config;
                const modelMap = new Map(entries);
                const channels = currentConfig.channels.map((channel) => (modelMap.has(channel.id) ? { ...channel, models: modelMap.get(channel.id) || [] } : channel));
                const nextConfig = withChannels(currentConfig, channels);
                (Object.keys(nextConfig) as Array<keyof typeof nextConfig>).forEach((key) => updateConfig(key, nextConfig[key]));
            }
            const modelCount = entries.reduce((total, [, models]) => total + models.length, 0);
            if (!failures.length) {
                message.success(`已导入配置并自动拉取 ${modelCount} 个模型`);
                return;
            }
            const firstError = failures[0]?.reason;
            const detail = firstError instanceof Error ? `：${firstError.message}` : "";
            if (entries.length) {
                message.warning(`已导入配置并拉取 ${modelCount} 个模型，${failures.length} 个渠道失败${detail}`);
            } else {
                message.error(`配置已导入，但模型拉取失败${detail}`);
            }
        });
    }, [config.channels, message, openConfigDialog, updateConfig]);

    return <>{children}</>;
}

function parseImportedApiKeys(value: string | null): Array<{ name: string; apiKey: string }> {
    if (!value) return [];
    try {
        const parsed = JSON.parse(value);
        if (!Array.isArray(parsed)) return [];
        return parsed
            .map((item) => ({
                name: typeof item?.name === "string" ? item.name.trim() : "",
                apiKey: typeof item?.apiKey === "string" ? item.apiKey.trim() : "",
            }))
            .filter((item) => item.name && item.apiKey);
    } catch {
        return [];
    }
}
