import { hashSeed, randomInteger, randomSource } from './seededRandom'

export const PERSON_GEOMETRIC_VERSION = 1

export type GeometricPalette = {
    background: string
    field: string
    primary: string
    secondary: string
    ink: string
}

export type PersonGeometricDescriptor = {
    palette: number
    frame: number
    motif: number
    pattern: number
    rotation: number
    offset: number
    detail: number
}

export const geometricPalettes: GeometricPalette[] = [
    { background: '#ece8f3', field: '#594773', primary: '#d49a72', secondary: '#8fb8aa', ink: '#2e2536' },
    { background: '#e1eef0', field: '#2f6874', primary: '#e5b65d', secondary: '#b86d67', ink: '#20383d' },
    { background: '#f2e8dc', field: '#875941', primary: '#df9c54', secondary: '#6e9890', ink: '#3d2d26' },
    { background: '#e5eddc', field: '#587541', primary: '#d9b94e', secondary: '#8e668d', ink: '#293624' },
    { background: '#eee4e8', field: '#7e4f68', primary: '#d88a68', secondary: '#719ba0', ink: '#3c2933' },
    { background: '#e3e8f4', field: '#465a8c', primary: '#d5a755', secondary: '#8aa9c1', ink: '#26304b' },
    { background: '#f1ead8', field: '#7b6839', primary: '#c86e57', secondary: '#709188', ink: '#38311f' },
    { background: '#e1ede9', field: '#3f7469', primary: '#c78d67', secondary: '#a885aa', ink: '#253b37' },
    { background: '#ebe7dc', field: '#5f625d', primary: '#d09a52', secondary: '#75949f', ink: '#30322f' },
    { background: '#ece5f0', field: '#685579', primary: '#be7a65', secondary: '#8ca474', ink: '#322a39' },
]

/** Frozen neutral presentation of the same opaque person seed. */
export function getPersonGeometricDescriptor(
    seed: string,
    version = PERSON_GEOMETRIC_VERSION,
): PersonGeometricDescriptor {
    if (version !== PERSON_GEOMETRIC_VERSION) throw new Error(`Unsupported geometric portrait version: ${version}`)
    const random = randomSource(hashSeed(`ombuddi-person-geometric:v${version}:${seed}`))
    return {
        palette: randomInteger(random, geometricPalettes.length),
        frame: randomInteger(random, 6),
        motif: randomInteger(random, 8),
        pattern: randomInteger(random, 6),
        rotation: randomInteger(random, 4) * 15,
        offset: randomInteger(random, 11) - 5,
        detail: randomInteger(random, 6),
    }
}
