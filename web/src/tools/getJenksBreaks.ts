export function getJenksBreak(breaks: number[], value: number) {
    if (!breaks || isNaN(Number(value)) || value === undefined || value === null) return null
    for (let i = 0; i < breaks.length - 1; i++) {
        if (value >= breaks[i] && value <= breaks[i + 1]) {
            return i
        }
    }
    return 0
}
