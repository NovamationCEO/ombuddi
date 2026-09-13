import { hashSeed, randomInteger, randomSource } from './seededRandom'

export type ScenePalette = {
    sky: string
    haze: string
    back: string
    front: string
    accent: string
    ink: string
}

export type CaseSceneDescriptor = {
    palette: number
    terrain: number
    focal: number
    atmosphere: number
    landmark: number
    horizon: number
    focalX: number
    focalY: number
    landmarkX: number
    ridgeA: number
    ridgeB: number
    detailShift: number
}

export const caseScenePalettes: ScenePalette[] = [
    { sky: '#25264f', haze: '#5b5f97', back: '#e08d79', front: '#4f8f8b', accent: '#f4c95d', ink: '#f9f3e8' },
    { sky: '#143642', haze: '#397367', back: '#70a37f', front: '#d68c45', accent: '#f2c14e', ink: '#f7f3e3' },
    { sky: '#4a1942', haze: '#893168', back: '#c45474', front: '#2e86ab', accent: '#f7b267', ink: '#fff4e6' },
    { sky: '#1f3b73', haze: '#4d6caa', back: '#8bb8c8', front: '#d06b58', accent: '#ffd166', ink: '#f7fbff' },
    { sky: '#3b2e5a', haze: '#71639b', back: '#9d8fc1', front: '#437f76', accent: '#f4a261', ink: '#fbf7ef' },
    { sky: '#263238', haze: '#546e7a', back: '#90a4ae', front: '#7b4f68', accent: '#f6bd60', ink: '#fff8e8' },
    { sky: '#183a37', haze: '#447a70', back: '#7fb685', front: '#d66b4d', accent: '#f3c969', ink: '#f8f1df' },
    { sky: '#4c2b36', haze: '#85586f', back: '#b98b82', front: '#417b7d', accent: '#f2d388', ink: '#fff7e8' },
    { sky: '#1d3557', haze: '#457b9d', back: '#a8dadc', front: '#6a4c93', accent: '#ffb703', ink: '#f1faee' },
    { sky: '#472d30', haze: '#7c5557', back: '#c59b76', front: '#496f5d', accent: '#f3d35b', ink: '#fff8e7' },
    { sky: '#243447', haze: '#4f6272', back: '#a4b7a7', front: '#9e5a63', accent: '#f2b84b', ink: '#f8f6ef' },
    { sky: '#342a4e', haze: '#66558c', back: '#c17c74', front: '#348aa7', accent: '#f5d06f', ink: '#fff8ed' },
]

export function getCaseSceneDescriptor(seed: string): CaseSceneDescriptor {
    const random = randomSource(hashSeed(`ombuddi-case-scene:${seed}`))
    return {
        palette: randomInteger(random, caseScenePalettes.length),
        terrain: randomInteger(random, 7),
        focal: randomInteger(random, 6),
        atmosphere: randomInteger(random, 6),
        landmark: randomInteger(random, 8),
        horizon: 50 + randomInteger(random, 13),
        focalX: 17 + randomInteger(random, 62),
        focalY: 16 + randomInteger(random, 24),
        landmarkX: 23 + randomInteger(random, 51),
        ridgeA: 23 + randomInteger(random, 20),
        ridgeB: 27 + randomInteger(random, 19),
        detailShift: randomInteger(random, 13),
    }
}
