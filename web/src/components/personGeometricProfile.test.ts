import { describe, expect, it } from 'vitest'
import {
    geometricPalettes,
    getPersonGeometricDescriptor,
    PERSON_GEOMETRIC_VERSION,
} from './personGeometricProfile'

describe('getPersonGeometricDescriptor', () => {
    it('is stable for the same person seed', () => {
        const seed = '37b5d34c-d7cc-4f02-9f98-41deef664c35'
        expect(getPersonGeometricDescriptor(seed)).toEqual(getPersonGeometricDescriptor(seed))
    })

    it('pins the frozen version-one mapping', () => {
        expect(getPersonGeometricDescriptor('37b5d34c-d7cc-4f02-9f98-41deef664c35')).toEqual({
            palette: 2,
            frame: 2,
            motif: 1,
            pattern: 0,
            rotation: 0,
            offset: 2,
            detail: 5,
        })
    })

    it('creates varied neutral markers from different seeds', () => {
        const descriptors = Array.from({ length: 24 }, (_, index) =>
            getPersonGeometricDescriptor(`00000000-0000-4000-8000-${index.toString().padStart(12, '0')}`),
        )
        expect(new Set(descriptors.map((descriptor) => JSON.stringify(descriptor))).size).toBe(24)
        expect(new Set(descriptors.map(({ frame, motif }) => `${frame}:${motif}`)).size).toBeGreaterThan(12)
    })

    it('keeps traits inside the frozen neutral catalog', () => {
        const descriptor = getPersonGeometricDescriptor('e43c49c3-e758-458f-b7e0-911c374ad217')
        expect(descriptor.palette).toBeLessThan(geometricPalettes.length)
        expect(descriptor.frame).toBeLessThan(6)
        expect(descriptor.motif).toBeLessThan(8)
        expect(descriptor.pattern).toBeLessThan(6)
    })

    it('has its own version and rejects unknown versions', () => {
        expect(PERSON_GEOMETRIC_VERSION).toBe(1)
        expect(() => getPersonGeometricDescriptor('person-seed', 99)).toThrow(
            'Unsupported geometric portrait version',
        )
    })
})
