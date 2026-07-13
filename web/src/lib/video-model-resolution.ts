export type FixedVideoModelResolution = {
    label: string;
    value: string;
};

const FIXED_RESOLUTIONS: Record<string, FixedVideoModelResolution> = {
    "480p": { label: "480p", value: "480p" },
    "720p": { label: "720p", value: "720p" },
    "1080p": { label: "1080p", value: "1080p" },
    "1k": { label: "1K", value: "1k" },
    "2k": { label: "2K", value: "2k" },
    "4k": { label: "4K", value: "4k" },
};

export function fixedVideoModelResolution(model: string): FixedVideoModelResolution | undefined {
    const match = model
        .trim()
        .toLowerCase()
        .match(/(?:^|[-_.])(480p|720p|1080p|1k|2k|4k)$/);
    return match ? FIXED_RESOLUTIONS[match[1]] : undefined;
}
