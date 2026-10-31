import { afterAll, expect, test } from "bun:test";
import type { AiConfig, ModelCapability } from "../src/stores/use-config-store";
import type { CanvasNodeData } from "../src/types/canvas";

// Config and i18n use browser storage during module initialization.
const values = new Map<string, string>();
const originalStorage = Object.getOwnPropertyDescriptor(globalThis, "localStorage");
Object.defineProperty(globalThis, "localStorage", {
    configurable: true,
    value: {
        getItem: (key: string) => values.get(key) ?? null,
        setItem: (key: string, value: string) => values.set(key, value),
        removeItem: (key: string) => values.delete(key),
    },
});
afterAll(() => {
    if (originalStorage) Object.defineProperty(globalThis, "localStorage", originalStorage);
    else Reflect.deleteProperty(globalThis, "localStorage");
});

const { defaultConfig, resolveModelForCapability, useConfigStore } = await import("../src/stores/use-config-store");
const { buildGenerationConfig, resetInterruptedGeneration } = await import("../src/lib/canvas/canvas-generation-helpers");
const { CanvasNodeType } = await import("../src/types/canvas");

const config: AiConfig = {
    ...defaultConfig,
    videoModel: "replacement::video-b",
    channels: [
        {
            id: "replacement",
            name: "Replacement",
            baseUrl: "https://example.com",
            apiKey: "test-key",
            apiFormat: "openai",
            models: [
                { name: "video-b", capability: "video" },
                { name: "video-a", capability: "video" },
                { name: "image-a", capability: "image" },
            ],
        },
    ],
};
const ready = useConfigStore.getState().isAiConfigReady;
const videoNode = (model: string): CanvasNodeData => ({
    id: "saved-video",
    type: CanvasNodeType.Video,
    title: "Saved video",
    position: { x: 0, y: 0 },
    width: 320,
    height: 180,
    metadata: { model, videoTaskId: "original-task", videoTaskProvider: "openai", seconds: "4" },
});

test("a saved video on a removed provider is not replaced by the default video model", () => {
    const selected = buildGenerationConfig(config, videoNode("removed::video-a"), "video");
    expect(selected.model).toBe("removed::video-a");
    expect(ready(selected, selected.model)).toBe(false);
});

test("removing a model from an existing provider prevents retry even with valid credentials", () => {
    const selected = buildGenerationConfig(config, videoNode("replacement::deleted-video"), "video");
    expect(selected.model).toBe("replacement::deleted-video");
    expect(ready(selected, selected.model)).toBe(false);
});

test("task recovery rejects a missing provider instead of querying the first provider", () => {
    expect(ready(config, "removed::video-a")).toBe(false);
    expect(ready(config, "unknown-video")).toBe(false);
});

test("an explicitly selected unavailable default is not replaced by the built-in default", () => {
    const selected = buildGenerationConfig({ ...config, videoModel: "removed::video-a" }, undefined, "video");
    expect(selected.model).toBe("removed::video-a");
    expect(ready(selected, selected.model)).toBe(false);
});

test("a new node without a selection still uses its configured default", () => {
    const selected = buildGenerationConfig(config, undefined, "video");
    expect(selected.model).toBe("replacement::video-b");
    expect(ready(selected, selected.model)).toBe(true);
});

test("switching generation capability still selects a model of the new capability", () => {
    expect(resolveModelForCapability(config, "replacement::image-a", "video")).toBe("replacement::video-b");
});

test("changing only the key on the same provider preserves the saved model and task", () => {
    const node = videoNode("replacement::video-a");
    const selected = buildGenerationConfig({ ...config, channels: [{ ...config.channels[0], apiKey: "rotated-key" }] }, node, "video");
    expect(selected.model).toBe("replacement::video-a");
    expect(ready(selected, selected.model)).toBe(true);
    expect(node.metadata?.videoTaskId).toBe("original-task");
    expect(ready({ ...selected, channels: [{ ...config.channels[0], apiKey: "" }] }, selected.model)).toBe(false);
});

test("unavailable explicit selections are preserved for every generation capability", () => {
    for (const capability of ["image", "video", "text", "audio"] as ModelCapability[]) {
        expect(resolveModelForCapability(config, `removed::${capability}`, capability)).toBe(`removed::${capability}`);
    }
});

test("refresh preserves an unfinished video with a remote task ID", () => {
    const node = videoNode("replacement::video-a");
    node.metadata = { ...node.metadata, status: "loading" };
    expect(resetInterruptedGeneration([node])[0]).toBe(node);
});

test("refresh resets interrupted alternatives without discarding completed content", () => {
    const node: CanvasNodeData = {
        ...videoNode("replacement::image-a"),
        type: CanvasNodeType.Image,
        metadata: {
            status: "success",
            content: "image:completed",
            images: [
                { id: "completed", content: "image:completed", status: "success", naturalWidth: 320, naturalHeight: 180, bytes: 100, mimeType: "image/png" },
                { id: "interrupted", content: "", status: "loading", naturalWidth: 0, naturalHeight: 0, bytes: 0, mimeType: "image/png" },
            ],
        },
    };
    const result = resetInterruptedGeneration([node])[0];
    expect(result.metadata?.status).toBe("success");
    expect(result.metadata?.content).toBe("image:completed");
    expect(result.metadata?.images?.map((image) => image.status)).toEqual(["success", "error"]);
});

test("refresh resets interrupted text alternatives", () => {
    const node: CanvasNodeData = {
        ...videoNode("replacement::text-a"),
        type: CanvasNodeType.Text,
        metadata: { status: "loading", texts: [{ id: "interrupted", status: "loading", content: "" }] },
    };
    const result = resetInterruptedGeneration([node])[0];
    expect(result.metadata?.status).toBe("error");
    expect(result.metadata?.texts?.[0].status).toBe("error");
});
