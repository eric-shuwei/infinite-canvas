type ImageMatch = {
    index: number;
    url: string;
};

export function extractPromptImages(baseUrl: string, markdown: string) {
    const matches: ImageMatch[] = [];

    for (const match of markdown.matchAll(/!\[[^\]]*]\((\S+?)(?:\s+["'][^"']*["'])?\)/g)) {
        matches.push({ index: match.index, url: match[1] });
    }
    for (const match of markdown.matchAll(/<img\b[^>]*\bsrc\s*=\s*(?:"([^"]+)"|'([^']+)'|([^\s>]+))[^>]*>/gi)) {
        matches.push({ index: match.index, url: match[1] || match[2] || match[3] });
    }

    const images = matches
        .sort((left, right) => left.index - right.index)
        .map((match) => absoluteImage(baseUrl, match.url))
        .filter(Boolean);
    return Array.from(new Set(images));
}

function absoluteImage(baseUrl: string, image: string) {
    if (!image) return "";
    if (/^https?:\/\//i.test(image)) return image;
    return `${baseUrl}/${image.replace(/^\.?\//, "")}`;
}
