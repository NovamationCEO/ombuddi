export function isStringArr(s: string) {
    try {
        if (Array.isArray(s)) return true
        return Array.isArray(JSON.parse(s))
    } catch (err) {
        return false
    }
}
