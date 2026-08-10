export function normalizeMinCellSize(value: string | number): number {
    const parsed = Number(value)
    if (!Number.isFinite(parsed)) return 1
    return Math.max(1, Math.floor(parsed))
}

/** Merge buckets smaller than minSize into a single "Other" bucket. */
export function suppressSmallBuckets(
    categories: string[],
    data: number[],
    minSize: number,
): { categories: string[]; data: number[] } {
    let otherTotal = 0
    const kept: { label: string; value: number }[] = []
    const normalizedMinimum = normalizeMinCellSize(minSize)

    categories.forEach((label, index) => {
        const value = data[index] ?? 0
        if (value < normalizedMinimum) {
            otherTotal += value
        } else {
            kept.push({ label, value })
        }
    })

    if (otherTotal > 0) {
        const existingOther = kept.find(bucket => bucket.label === 'Other')
        if (existingOther) {
            existingOther.value += otherTotal
        } else {
            kept.push({ label: 'Other', value: otherTotal })
        }
    }

    return {
        categories: kept.map(bucket => bucket.label),
        data: kept.map(bucket => bucket.value),
    }
}
