import { describe, expect, it } from 'vitest'
import type { PersonType } from '../types/majorTypes'
import { personDisplayDetails, personDisplayLabel } from './personDisplay'

const person: PersonType = {
    id: 'person-1',
    monsterSeed: '37b5d34c-d7cc-4f02-9f98-41deef664c35',
    monsterVersion: 1,
    hashedName: 'never-display-this',
    publicName: 'Ada Example',
    isPublic: true,
    gender: 'Woman',
    generation: 'Millennial',
    race: 'Multiracial',
    primaryRole: 'Faculty',
    isInternational: true,
    category1: 'Graduate program',
    category2: '',
    category3: 'unknown',
    organizationId: 'never-display-this-either',
}

describe('EntryPersonMarker display data', () => {
    it('uses a name only when the person is explicitly public', () => {
        expect(personDisplayLabel(person)).toBe('Ada Example')
        expect(personDisplayLabel({ ...person, isPublic: false })).toBe('Person details')
    })

    it('includes useful public-facing details and omits security fields and placeholders', () => {
        expect(personDisplayDetails(person)).toEqual([
            { label: 'Role', value: 'Faculty' },
            { label: 'Generation', value: 'Millennial' },
            { label: 'Gender', value: 'Woman' },
            { label: 'Race', value: 'Multiracial' },
            { label: 'Category 1', value: 'Graduate program' },
            { label: 'International', value: 'Yes' },
        ])

        const serialized = JSON.stringify(personDisplayDetails(person))
        expect(serialized).not.toContain(person.hashedName)
        expect(serialized).not.toContain(person.organizationId)
        expect(serialized).not.toContain('unknown')
    })

    it('ignores unexpected non-string legacy values instead of crashing', () => {
        const malformedPerson = {
            ...person,
            publicName: 7,
            primaryRole: 42,
            category1: ['unexpected'],
            category2: false,
        } as unknown as PersonType

        expect(() => personDisplayDetails(malformedPerson)).not.toThrow()
        expect(() => personDisplayLabel(malformedPerson)).not.toThrow()
        expect(personDisplayLabel(malformedPerson)).toBe('Person details')
        expect(personDisplayDetails(malformedPerson)).not.toEqual(
            expect.arrayContaining([
                expect.objectContaining({ label: 'Role' }),
                expect.objectContaining({ label: 'Category 1' }),
                expect.objectContaining({ label: 'Category 2' }),
            ]),
        )
    })
})
