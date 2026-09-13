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

/**
 * Frozen version-one mapping from an opaque random seed to visual traits.
 * Do not alter this mapping after release; introduce a version-two function
 * instead so existing people retain the same visual identity.
 */
export function getPersonMonsterDescriptor(seed: string, version = PERSON_MONSTER_VERSION): PersonMonsterDescriptor {
    if (version !== PERSON_MONSTER_VERSION) throw new Error(`Unsupported monster portrait version: ${version}`)
    const random = randomSource(hashSeed(`ombuddi-person-monster:v${version}:${seed}`))
    const eyes = randomInteger(random, 6)
    let accessory = randomInteger(random, 8)

    // Glasses remain legible over the conventional two-eye configurations.
    // Other eye layouts receive one of the lower-face accessories instead.
    if ((eyes === 1 || eyes === 4) && (accessory === 1 || accessory === 2)) {
        accessory = 3 + randomInteger(random, 5)
    }

    return {
        palette: randomInteger(random, monsterPalettes.length),
        bodyShape: randomInteger(random, 8),
        horns: randomInteger(random, 8),
        hornPattern: randomInteger(random, 4),
        ears: randomInteger(random, 6),
        eyes,
        markings: randomInteger(random, 8),
        accessory,
        mouth: randomInteger(random, 6),
        tuft: randomInteger(random, 6),
        backdrop: randomInteger(random, 4),
    }
}
import { hashSeed, randomInteger, randomSource } from './seededRandom'
