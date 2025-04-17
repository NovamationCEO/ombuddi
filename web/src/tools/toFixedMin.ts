export function toFixedMin(val: string | number | undefined, minPlaces: number, maxPlaces?: number) {
    if (!val) return undefined
    const baseValue = maxPlaces ? Number(Number(val).toFixed(maxPlaces)).toString() : val.toString()
    const split = baseValue.split('.')
    const existingDecimals = split[1]?.length || 0
    const neededDecimals = Math.max(existingDecimals, minPlaces)
    return Number(baseValue).toFixed(neededDecimals)
}
