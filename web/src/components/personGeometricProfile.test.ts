import { describe, expect, it } from 'vitest'
import { geometricPalettes, getPersonGeometricDescriptor } from './personGeometricProfile'

describe('getPersonGeometricDescriptor', () => {
    it('is stable for the same person seed', () => {
        const seed = '37b5d34c-d7cc-4f02-9f98-41deef664c35'
        expect(getPersonGeometricDescriptor(seed)).toEqual(getPersonGeometricDescriptor(seed))
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
})
