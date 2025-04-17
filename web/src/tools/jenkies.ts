import { jenks } from 'simple-statistics'

export function jenkies(values: number[], buffer = 0.1, positiveOnlyResults = false) {
    if (!values || !values.length) return { jenksSuccess: false, breaks: [], classCount: 0, values: [] }

    values.sort((a, b) => b - a)

    const classCount = Math.min(Math.floor(1 + 3.322 * Math.log10(values.length)), new Set(values).size)
    const breaks = jenks(values, classCount)

    const uniqueBreaks = Array.from(new Set(breaks))

    if (uniqueBreaks.length === 1) {
        const minVal = positiveOnlyResults ? Math.max(uniqueBreaks[0] - buffer, 0) : uniqueBreaks[0] - buffer
        return { jenksSuccess: false, classCount, breaks: [minVal, uniqueBreaks[0] + buffer], values }
    }

    if (uniqueBreaks.length <= 0) {
        return { jenksSuccess: false, classCount, breaks: [], values }
    }

    return { classCount, values, breaks: uniqueBreaks, jenksSuccess: true }
}
