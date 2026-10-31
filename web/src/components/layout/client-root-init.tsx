import type { ReactNode } from "react";
import { useEffect, useRef } from "react";
import { App } from "antd";
import { useTranslation } from "react-i18next";

import { fetchChannelModels } from "@/services/api/image";
import { createModelChannel, normalizeChannelModels, useConfigStore, withChannels, type ModelChannel } from "@/stores/use-config-store";
import { usePromptSourceScheduler } from "@/hooks/use-prompt-source-scheduler";

export function ClientRootInit({ children }: { children: ReactNode }) {
    const { message } = App.useApp();
    const { t } = useTranslation();
    const handledConfigParams = useRef(false);
    const importChannelCredentials = useConfigStore((state) => state.importChannelCredentials);
    const openConfigDialog = useConfigStore((state) => state.openConfigDialog);

    usePromptSourceScheduler();

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
        let importedChannels: ModelChannel[];
        if (apiKeys.length) {
            const currentConfig = useConfigStore.getState().config;
            importedChannels = apiKeys.map((item, index) => createModelChannel({ id: `imported-${index + 1}`, name: item.name, baseUrl: baseUrl || undefined, apiKey: item.apiKey }));
            const importedIds = new Set(importedChannels.map((channel) => channel.id));
            const channels = [...currentConfig.channels.filter((channel) => !importedIds.has(channel.id)), ...importedChannels];
            useConfigStore.setState({ config: withChannels(currentConfig, channels) });
        } else {
            const result = importChannelCredentials({ baseUrl, apiKey });
            if (!result.channelId) {
                openConfigDialog(false, "channels");
                message.error(t(result.status === "missing-base-url" ? "config.importedChannelBaseUrlRequired" : "config.importedChannelBaseUrlInvalid"));
                return;
            }
            importedChannels = useConfigStore.getState().config.channels.filter((channel) => channel.id === result.channelId);
        }
        openConfigDialog(false, "channels");
        const importedChannelsToFetch = importedChannels.filter((channel) => channel.baseUrl.trim() && channel.apiKey.trim());
        if (!importedChannelsToFetch.length) {
            message.success(t("config.importedDirectConfig"));
            return;
        }
        void Promise.allSettled(importedChannelsToFetch.map(async (channel) => [channel.id, await fetchChannelModels(channel)] as const)).then((results) => {
            const entries = results.flatMap((result) => (result.status === "fulfilled" ? [result.value] : []));
            const failures = results.filter((result) => result.status === "rejected");
            if (entries.length) {
                const currentConfig = useConfigStore.getState().config;
                const modelMap = new Map(entries);
                const channels = currentConfig.channels.map((channel) => {
                    const imported = importedChannelsToFetch.find((item) => item.id === channel.id);
                    return modelMap.has(channel.id) && imported?.baseUrl === channel.baseUrl && imported.apiKey === channel.apiKey ? { ...channel, models: normalizeChannelModels(modelMap.get(channel.id)) } : channel;
                });
                useConfigStore.setState({ config: withChannels(currentConfig, channels) });
            }
            const modelCount = entries.reduce((total, [, models]) => total + models.length, 0);
            const firstError = failures[0]?.reason;
            const detail = firstError instanceof Error ? `：${firstError.message}` : "";
            if (!failures.length) {
                message.success(t("config.importedDirectConfigWithModels", { count: modelCount }));
            } else if (entries.length) {
                message.warning(t("config.importedDirectConfigPartial", { count: modelCount, failures: failures.length, detail }));
            } else {
                message.error(t("config.importedDirectConfigModelFailure", { detail }));
            }
        });
    }, [importChannelCredentials, message, openConfigDialog, t]);

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
