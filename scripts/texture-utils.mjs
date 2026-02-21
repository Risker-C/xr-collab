export function rankTexturesBySize(files = []) {
    const sorted = [...files]
        .filter((file) => file && Number.isFinite(file.size) && file.size > 0)
        .sort((a, b) => b.size - a.size);

    const topCount = Math.max(1, Math.ceil(sorted.length * 0.2));
    const top = sorted.slice(0, topCount);
    const totalSize = sorted.reduce((acc, file) => acc + file.size, 0);
    const topSize = top.reduce((acc, file) => acc + file.size, 0);

    return {
        all: sorted,
        top,
        totalSize,
        topSize,
        topRatio: totalSize > 0 ? topSize / totalSize : 0
    };
}

export function bytesToMB(bytes = 0) {
    return Number((bytes / (1024 * 1024)).toFixed(2));
}
