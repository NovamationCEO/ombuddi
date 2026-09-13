import type { PersonType } from '../types/majorTypes'

export type PersonDisplayDetail = {
    label: string
    value: string
}

function usefulValue(value: unknown): value is string {
    if (typeof value !== 'string' || !value.trim()) return false
    return !['unknown', 'n/a'].includes(value.trim().toLowerCase())
}

export function personDisplayLabel(person: PersonType): string {
    if (person.isPublic && usefulValue(person.publicName)) return person.publicName.trim()
    return 'Person details'
}

export function personDisplayDetails(person: PersonType): PersonDisplayDetail[] {
    const details: PersonDisplayDetail[] = []
    const candidates: Array<[string, unknown]> = [
        ['Role', person.primaryRole],
        ['Generation', person.generation],
        ['Gender', person.gender],
        ['Race', person.race],
        ['Category 1', person.category1],
        ['Category 2', person.category2],
        ['Category 3', person.category3],
    ]

    for (const [label, value] of candidates) {
        if (usefulValue(value)) details.push({ label, value: value.trim() })
    }
    if (person.isInternational === true) details.push({ label: 'International', value: 'Yes' })

    return details
}

export function uniquePeopleById(people: PersonType[]): PersonType[] {
    return [...new Map(people.map((person) => [person.id, person])).values()]
}
