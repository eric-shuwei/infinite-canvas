import { CanvasNodeType, type CanvasConnection, type CanvasNodeData, type CanvasNodeImage, type CanvasNodeMetadata } from "@/types/canvas";

type LegacyCanvasNodeMetadata = CanvasNodeMetadata & {
    isBatchRoot?: boolean;
    batchRootId?: string;
    batchChildIds?: string[];
    batchUsesReferenceImages?: boolean;
    imageBatchExpanded?: boolean;
};

const legacyBatchKeys = ["isBatchRoot", "batchRootId", "batchChildIds", "batchUsesReferenceImages", "imageBatchExpanded"] as const;

export function migrateLegacyImageBatches(nodes: CanvasNodeData[], connections: CanvasConnection[]) {
    if (!nodes.some((node) => hasLegacyBatchMetadata(node.metadata))) return { nodes, connections };

    const nodeById = new Map(nodes.map((node) => [node.id, node]));
    const rootIds = new Set<string>();
    nodes.forEach((node) => {
        const metadata = node.metadata as LegacyCanvasNodeMetadata | undefined;
        if (node.type === CanvasNodeType.Image && (metadata?.isBatchRoot || metadata?.batchChildIds)) rootIds.add(node.id);
    });
    nodes.forEach((node) => {
        const rootId = (node.metadata as LegacyCanvasNodeMetadata | undefined)?.batchRootId;
        if (rootId && nodeById.get(rootId)?.type === CanvasNodeType.Image) rootIds.add(rootId);
    });

    const childIdsByRoot = new Map<string, string[]>();
    const childToRoot = new Map<string, string>();
    rootIds.forEach((rootId) => {
        const root = nodeById.get(rootId);
        const listedIds = ((root?.metadata as LegacyCanvasNodeMetadata | undefined)?.batchChildIds || []).filter((id) => nodeById.get(id)?.type === CanvasNodeType.Image);
        const pointedIds = nodes.filter((node) => node.type === CanvasNodeType.Image && (node.metadata as LegacyCanvasNodeMetadata | undefined)?.batchRootId === rootId).map((node) => node.id);
        const childIds = [...new Set([...listedIds, ...pointedIds])].filter((id) => id !== rootId && !rootIds.has(id) && !childToRoot.has(id));
        childIds.forEach((id) => childToRoot.set(id, rootId));
        childIdsByRoot.set(rootId, childIds);
    });

    const migratedNodes = nodes.flatMap((node) => {
        if (childToRoot.has(node.id)) return [];
        const metadata = node.metadata as LegacyCanvasNodeMetadata | undefined;
        if (!hasLegacyBatchMetadata(metadata) && !rootIds.has(node.id)) return [node];

        const cleanMetadata = stripLegacyBatchMetadata(metadata);
        if (!rootIds.has(node.id)) return [{ ...node, metadata: cleanMetadata }];

        const childImages = (childIdsByRoot.get(node.id) || []).map((id) => imageFromLegacyNode(nodeById.get(id)!));
        const existingImages = cleanMetadata.images || [];
        const existingById = new Map(existingImages.map((image) => [image.id, image]));
        const images = [...childImages.map((image) => ({ ...image, ...existingById.get(image.id) })), ...existingImages.filter((image) => !childImages.some((child) => child.id === image.id))];
        if (!images.length) return [{ ...node, metadata: cleanMetadata }];

        const primaryImage = selectPrimaryImage(cleanMetadata, images);
        return [
            {
                ...node,
                metadata: {
                    ...cleanMetadata,
                    ...(primaryImage
                        ? {
                              content: primaryImage.content || undefined,
                              storageKey: primaryImage.storageKey || undefined,
                              naturalWidth: primaryImage.naturalWidth || undefined,
                              naturalHeight: primaryImage.naturalHeight || undefined,
                              bytes: primaryImage.bytes,
                              mimeType: primaryImage.mimeType || undefined,
                          }
                        : {}),
                    count: images.length,
                    images,
                    primaryImageId: primaryImage?.id,
                },
            },
        ];
    });

    if (!childToRoot.size) return { nodes: migratedNodes, connections };
    const seenConnections = new Set<string>();
    const migratedConnections = connections.flatMap((connection) => {
        const fromNodeId = childToRoot.get(connection.fromNodeId) || connection.fromNodeId;
        const toNodeId = childToRoot.get(connection.toNodeId) || connection.toNodeId;
        if (fromNodeId === toNodeId) return [];
        const key = `${fromNodeId}\u0000${toNodeId}`;
        if (seenConnections.has(key)) return [];
        seenConnections.add(key);
        return [{ ...connection, fromNodeId, toNodeId }];
    });
    return { nodes: migratedNodes, connections: migratedConnections };
}

export function migrateLegacyCanvasProject<T extends { nodes: CanvasNodeData[]; connections: CanvasConnection[] }>(project: T): T {
    const migrated = migrateLegacyImageBatches(project.nodes, project.connections);
    return migrated.nodes === project.nodes && migrated.connections === project.connections ? project : { ...project, ...migrated };
}

export function migrateLegacyCanvasProjects<T extends { nodes: CanvasNodeData[]; connections: CanvasConnection[] }>(projects: T[]) {
    let changed = false;
    const migrated = projects.map((project) => {
        const next = migrateLegacyCanvasProject(project);
        if (next !== project) changed = true;
        return next;
    });
    return changed ? migrated : projects;
}

function hasLegacyBatchMetadata(metadata?: CanvasNodeMetadata | LegacyCanvasNodeMetadata) {
    return Boolean(metadata && legacyBatchKeys.some((key) => key in metadata));
}

function stripLegacyBatchMetadata(metadata?: LegacyCanvasNodeMetadata): CanvasNodeMetadata {
    if (!metadata) return {};
    const { isBatchRoot: _isBatchRoot, batchRootId: _batchRootId, batchChildIds: _batchChildIds, batchUsesReferenceImages: _batchUsesReferenceImages, imageBatchExpanded: _imageBatchExpanded, ...cleanMetadata } = metadata;
    return cleanMetadata;
}

function imageFromLegacyNode(node: CanvasNodeData): CanvasNodeImage {
    const metadata = node.metadata;
    return {
        id: node.id,
        status: metadata?.status || (metadata?.content || metadata?.storageKey ? "success" : "idle"),
        ...(metadata?.errorDetails ? { errorDetails: metadata.errorDetails } : {}),
        content: metadata?.content || "",
        storageKey: metadata?.storageKey || "",
        naturalWidth: metadata?.naturalWidth || 0,
        naturalHeight: metadata?.naturalHeight || 0,
        bytes: metadata?.bytes || 0,
        mimeType: metadata?.mimeType || "",
    };
}

function selectPrimaryImage(metadata: CanvasNodeMetadata, images: CanvasNodeImage[]) {
    return (
        images.find((image) => image.id === metadata.primaryImageId) ||
        images.find((image) => Boolean(metadata.storageKey && image.storageKey === metadata.storageKey)) ||
        images.find((image) => Boolean(metadata.content && image.content === metadata.content)) ||
        images.find((image) => Boolean(image.content || image.storageKey)) ||
        images[0]
    );
}
