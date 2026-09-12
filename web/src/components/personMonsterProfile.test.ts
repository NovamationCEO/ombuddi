import { describe, expect, it } from 'vitest'
import { getPersonMonsterDescriptor, monsterPalettes, PERSON_MONSTER_VERSION } from './personMonsterProfile'

describe('getPersonMonsterDescriptor', () => {
    it('returns the same versioned portrait for the same seed', () => {
        const seed = '37b5d34c-d7cc-4f02-9f98-41deef664c35'
        expect(getPersonMonsterDescriptor(seed, PERSON_MONSTER_VERSION)).toEqual(
            getPersonMonsterDescriptor(seed, PERSON_MONSTER_VERSION),
        )
    })

    it('produces substantial visual variation across random person seeds', () => {
        const descriptors = Array.from({ length: 24 }, (_, index) =>
            getPersonMonsterDescriptor(`00000000-0000-4000-8000-${index.toString().padStart(12, '0')}`),
        )
        const signatures = new Set(descriptors.map((descriptor) => JSON.stringify(descriptor)))
        const silhouettes = new Set(
            descriptors.map((descriptor) => `${descriptor.bodyShape}:${descriptor.horns}:${descriptor.ears}`),
        )

        expect(signatures.size).toBe(24)
        expect(silhouettes.size).toBeGreaterThan(12)
    })

    it('keeps every generated trait within the frozen version-one catalog', () => {
        const descriptor = getPersonMonsterDescriptor('e43c49c3-e758-458f-b7e0-911c374ad217')
        expect(descriptor.palette).toBeGreaterThanOrEqual(0)
        expect(descriptor.palette).toBeLessThan(monsterPalettes.length)
        expect(descriptor.bodyShape).toBeLessThan(8)
        expect(descriptor.horns).toBeLessThan(8)
        expect(descriptor.eyes).toBeLessThan(6)
        expect(descriptor.markings).toBeLessThan(8)
        expect(descriptor.accessory).toBeLessThan(8)
    })
})
