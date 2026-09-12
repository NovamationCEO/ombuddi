// Frozen trait catalog for person monster portraits.
export const PERSON_MONSTER_VERSION = 1

export type MonsterPalette = {
    body: string
    accent: string
    detail: string
    background: string
}

export type PersonMonsterDescriptor = {
    palette: number
    bodyShape: number
    horns: number
    hornPattern: number
    ears: number
    eyes: number
    markings: number
    accessory: number
    mouth: number
    tuft: number
    backdrop: number
}

// Palettes intentionally vary lightness as well as hue. Shape, markings, and
// accessories carry most of the recognition load, so color is never the only
// difference between two portraits.
export const monsterPalettes: MonsterPalette[] = [
    { body: '#8f5ac5', accent: '#e48bbb', detail: '#5d3a85', background: '#eee4f6' },
    { body: '#3d91b8', accent: '#7bc8c4', detail: '#235b78', background: '#dff1f4' },
    { body: '#df6b5d', accent: '#f4b45f', detail: '#963f45', background: '#f9e5dc' },
    { body: '#6e9d45', accent: '#d0c95b', detail: '#42652f', background: '#e8f0da' },
    { body: '#d4882f', accent: '#f2ce69', detail: '#8e5428', background: '#f8ead5' },
    { body: '#5d73c7', accent: '#76b8dc', detail: '#354782', background: '#e1e8f8' },
    { body: '#bd5e91', accent: '#eca0a6', detail: '#793c68', background: '#f5e1eb' },
    { body: '#368879', accent: '#8cc6a1', detail: '#235c51', background: '#dff0e8' },
    { body: '#9a6a4b', accent: '#dca778', detail: '#62432f', background: '#f2e6da' },
    { body: '#7a78a8', accent: '#c09ac8', detail: '#4c4a76', background: '#e9e7f2' },
    { body: '#b77735', accent: '#e6ba63', detail: '#704927', background: '#f4ead7' },
    { body: '#4d8a9a', accent: '#d28a70', detail: '#315b68', background: '#e0edf0' },
]

function hashSeed(seed: string) {
    let hash = 2166136261
    for (let index = 0; index < seed.length; index += 1) {
        hash ^= seed.charCodeAt(index)
        hash = Math.imul(hash, 16777619)
    }
    return hash >>> 0
}

function randomSource(seed: number) {
    let state = seed || 1
    return () => {
        state += 0x6d2b79f5
        let value = state
        value = Math.imul(value ^ (value >>> 15), value | 1)
        value ^= value + Math.imul(value ^ (value >>> 7), value | 61)
        return ((value ^ (value >>> 14)) >>> 0) / 4294967296
    }
}

function integer(random: () => number, maximum: number) {
    return Math.floor(random() * maximum)
}

/**
 * Frozen version-one mapping from an opaque random seed to visual traits.
 * Do not alter this mapping after release; introduce a version-two function
 * instead so existing people retain the same visual identity.
 */
export function getPersonMonsterDescriptor(seed: string, version = PERSON_MONSTER_VERSION): PersonMonsterDescriptor {
    const supportedVersion = version === PERSON_MONSTER_VERSION ? version : PERSON_MONSTER_VERSION
    const random = randomSource(hashSeed(`ombuddi-person-monster:v${supportedVersion}:${seed}`))
    const eyes = integer(random, 6)
    let accessory = integer(random, 8)

    // Glasses remain legible over the conventional two-eye configurations.
    // Other eye layouts receive one of the lower-face accessories instead.
    if ((eyes === 1 || eyes === 4) && (accessory === 1 || accessory === 2)) {
        accessory = 3 + integer(random, 5)
    }

    return {
        palette: integer(random, monsterPalettes.length),
        bodyShape: integer(random, 8),
        horns: integer(random, 8),
        hornPattern: integer(random, 4),
        ears: integer(random, 6),
        eyes,
        markings: integer(random, 8),
        accessory,
        mouth: integer(random, 6),
        tuft: integer(random, 6),
        backdrop: integer(random, 4),
    }
}
