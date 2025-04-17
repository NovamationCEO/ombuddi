// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function sourceThis(rows?: { [x: string]: any }[] | { [x: string]: any }) {
    if (!rows) return ''
    const data = Array.isArray(rows) ? rows : [rows]
    const sources = data.flatMap((r) => [r.source, r.source2]).filter((el) => el)
    const uniqueSources = [...new Set(sources)]
    return uniqueSources.filter((s) => s.length).join(', ')
}
