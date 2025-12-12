function formatBytes(bytes = 0) {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    const value = bytes / Math.pow(k, i);
    return `${value.toFixed(1)} ${sizes[i]}`;
}

function formatPercent(value) {
    if (value === null || value === undefined) {
        return 'N/A';
    }
    return `${value.toFixed(1)}%`;
}

function sparkline(history = [], max = 100) {
    if (!history.length) return '∅';
    const chars = '▁▂▃▄▅▆▇█';
    const points = history.slice(-20);
    return points
        .map(v => {
            const ratio = Math.max(0, Math.min(1, v / max));
            const index = Math.min(chars.length - 1, Math.round(ratio * (chars.length - 1)));
            return chars[index];
        })
        .join('');
}

module.exports = { formatBytes, formatPercent, sparkline };
