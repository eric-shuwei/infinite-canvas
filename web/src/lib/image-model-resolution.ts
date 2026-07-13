export type FixedImageModelResolution = {
    label: "1K" | "2K" | "4K";
    quality: "low" | "medium" | "high";
};

const FIXED_RESOLUTIONS: Record<string, FixedImageModelResolution> = {
    "1k": { label: "1K", quality: "low" },
    "2k": { label: "2K", quality: "medium" },
    "4k": { label: "4K", quality: "high" },
};

export function fixedImageModelResolution(model: string): FixedImageModelResolution | undefined {
    const match = model.trim().toLowerCase().match(/(?:^|[-_.])(1k|2k|4k)$/);
    return match ? FIXED_RESOLUTIONS[match[1]] : undefined;
}

export function imageSizeRatio(size: string): string | undefined {
    const value = size.trim();
    if (!value || value.toLowerCase() === "auto") return undefined;
    if (value.includes(":")) return value;

    const match = value.match(/^(\d+)x(\d+)$/i);
    if (!match) return value;
    const width = Number(match[1]);
    const height = Number(match[2]);
    const divisor = greatestCommonDivisor(width, height);
    return `${width / divisor}:${height / divisor}`;
}

function greatestCommonDivisor(left: number, right: number): number {
    let a = Math.abs(left);
    let b = Math.abs(right);
    while (b) {
        [a, b] = [b, a % b];
    }
    return a || 1;
}
