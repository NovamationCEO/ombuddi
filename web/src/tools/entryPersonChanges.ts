import type { PersonType } from '../types/majorTypes'

export function entryPersonChanges(originalIds: string[], nextPeople: PersonType[]) {
    const previousIds = new Set(originalIds)
    const nextIds = new Set(nextPeople.map((person) => person.id))
    return {
        additions: nextPeople.filter((person) => !previousIds.has(person.id)),
        removals: originalIds.filter((personId) => !nextIds.has(personId)),
    }
}
