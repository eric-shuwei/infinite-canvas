import assert from "node:assert/strict";

import { migrateLegacyImageBatches } from "../src/lib/canvas/canvas-data-migration.ts";
import { CanvasNodeType, type CanvasConnection, type CanvasNodeData } from "../src/types/canvas.ts";
import { installBrowserStorageMock } from "./test-browser-env.ts";

const legacyNodes = [
    {
        id: "source",
        type: CanvasNodeType.Text,
        title: "source",
        position: { x: 0, y: 0 },
        width: 200,
        height: 120,
        metadata: { content: "prompt" },
    },
    {
        id: "root",
        type: CanvasNodeType.Image,
        title: "legacy batch",
        position: { x: 240, y: 80 },
        width: 320,
        height: 240,
        metadata: {
            content: "blob:primary",
            storageKey: "image:primary",
            naturalWidth: 1600,
            naturalHeight: 1200,
            bytes: 120,
            mimeType: "image/png",
            prompt: "legacy prompt",
            status: "success",
            count: 3,
            isBatchRoot: true,
            batchChildIds: ["child-error", "child-primary", "missing-child"],
            batchUsesReferenceImages: true,
            imageBatchExpanded: true,
            primaryImageId: "child-primary",
        },
    },
    {
        id: "child-error",
        type: CanvasNodeType.Image,
        title: "legacy child error",
        position: { x: 600, y: 0 },
        width: 320,
        height: 240,
        metadata: {
            prompt: "legacy prompt",
            status: "error",
            errorDetails: "upstream failed",
            batchRootId: "root",
        },
    },
    {
        id: "child-primary",
        type: CanvasNodeType.Image,
        title: "legacy child primary",
        position: { x: 600, y: 280 },
        width: 320,
        height: 240,
        metadata: {
            content: "blob:primary",
            storageKey: "image:primary",
            naturalWidth: 1600,
            naturalHeight: 1200,
            bytes: 120,
            mimeType: "image/png",
            prompt: "legacy prompt",
            status: "success",
            batchRootId: "root",
        },
    },
    {
        id: "single",
        type: CanvasNodeType.Image,
        title: "single image",
        position: { x: 960, y: 0 },
        width: 320,
        height: 240,
        metadata: { content: "blob:single", storageKey: "image:single", status: "success" },
    },
    {
        id: "orphan",
        type: CanvasNodeType.Image,
        title: "orphan legacy child",
        position: { x: 960, y: 280 },
        width: 320,
        height: 240,
        metadata: { content: "blob:orphan", storageKey: "image:orphan", status: "success", batchRootId: "missing-root" },
    },
    {
        id: "output",
        type: CanvasNodeType.Config,
        title: "output",
        position: { x: 1320, y: 0 },
        width: 300,
        height: 200,
    },
] as unknown as CanvasNodeData[];

const legacyConnections: CanvasConnection[] = [
    { id: "source-root", fromNodeId: "source", toNodeId: "root" },
    { id: "root-error", fromNodeId: "root", toNodeId: "child-error" },
    { id: "root-primary", fromNodeId: "root", toNodeId: "child-primary" },
    { id: "primary-output", fromNodeId: "child-primary", toNodeId: "output" },
    { id: "source-error", fromNodeId: "source", toNodeId: "child-error" },
    { id: "child-child", fromNodeId: "child-error", toNodeId: "child-primary" },
    { id: "unrelated", fromNodeId: "source", toNodeId: "single" },
    { id: "orphan-output", fromNodeId: "orphan", toNodeId: "output" },
];

const migrated = migrateLegacyImageBatches(legacyNodes, legacyConnections);
const root = migrated.nodes.find((node) => node.id === "root");
const single = migrated.nodes.find((node) => node.id === "single");
const orphan = migrated.nodes.find((node) => node.id === "orphan");

assert.deepEqual(
    migrated.nodes.map((node) => node.id),
    ["source", "root", "single", "orphan", "output"],
    "legacy child nodes are folded into their root without reordering unrelated nodes",
);
assert.deepEqual(
    root?.metadata?.images,
    [
        { id: "child-error", status: "error", errorDetails: "upstream failed", content: "", storageKey: "", naturalWidth: 0, naturalHeight: 0, bytes: 0, mimeType: "" },
        { id: "child-primary", status: "success", content: "blob:primary", storageKey: "image:primary", naturalWidth: 1600, naturalHeight: 1200, bytes: 120, mimeType: "image/png" },
    ],
    "child image results keep their order, success data, and failure details",
);
assert.equal(root?.metadata?.primaryImageId, "child-primary", "the previous primary image remains selected");
assert.equal(root?.metadata?.content, "blob:primary", "the root keeps the primary image content fallback");
assert.equal(root?.metadata?.count, 2, "the migrated count reflects the images that still exist");
assert.equal(root?.position.x, 240, "the root position is preserved");
assert.equal(root?.width, 320, "the root dimensions are preserved");
assert.equal("isBatchRoot" in (root?.metadata || {}), false, "legacy root flags are removed");
assert.equal("batchChildIds" in (root?.metadata || {}), false, "legacy child lists are removed");
assert.equal("imageBatchExpanded" in (root?.metadata || {}), false, "legacy expansion state is removed");
assert.equal(single, legacyNodes[4], "ordinary nodes remain untouched");
assert.equal("batchRootId" in (orphan?.metadata || {}), false, "orphaned legacy children remain usable as standalone images");
assert.deepEqual(
    migrated.connections,
    [
        { id: "source-root", fromNodeId: "source", toNodeId: "root" },
        { id: "primary-output", fromNodeId: "root", toNodeId: "output" },
        { id: "unrelated", fromNodeId: "source", toNodeId: "single" },
        { id: "orphan-output", fromNodeId: "orphan", toNodeId: "output" },
    ],
    "internal batch edges are removed while external child edges are rewired and deduplicated",
);

const secondPass = migrateLegacyImageBatches(migrated.nodes, migrated.connections);
assert.equal(secondPass.nodes, migrated.nodes, "the migration is idempotent for nodes");
assert.equal(secondPass.connections, migrated.connections, "the migration is idempotent for connections");

installBrowserStorageMock();
const { resetInterruptedGeneration } = await import("../src/lib/canvas/canvas-generation-helpers.ts");
const [restoredPartialBatch] = resetInterruptedGeneration([
    {
        id: "partial-batch",
        type: CanvasNodeType.Image,
        title: "partial batch",
        position: { x: 0, y: 0 },
        width: 320,
        height: 240,
        metadata: {
            status: "success",
            images: [
                { id: "success", status: "success", content: "blob:success", storageKey: "image:success", naturalWidth: 800, naturalHeight: 600, bytes: 10, mimeType: "image/png" },
                { id: "interrupted", status: "loading", content: "", storageKey: "", naturalWidth: 0, naturalHeight: 0, bytes: 0, mimeType: "" },
            ],
            primaryImageId: "success",
        },
    },
]);
assert.equal(restoredPartialBatch.metadata?.status, "success", "a completed primary image keeps the root successful");
assert.equal(restoredPartialBatch.metadata?.images?.[1]?.status, "error", "interrupted image slots are recovered even when the legacy root was already successful");

console.log("canvas data migration tests passed");
