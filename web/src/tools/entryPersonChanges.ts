import type { EntryPersonType } from '../types/majorTypes'

export function entryPersonChanges(originalPeople: EntryPersonType[], nextPeople: EntryPersonType[]) {
    const previous = new Map(originalPeople.map((person) => [person.id, person]))
    const nextIds = new Set(nextPeople.map((person) => person.id))
    return {
        additions: nextPeople.filter((person) => !previous.has(person.id)),
        updates: nextPeople.filter(
            (person) =>
                previous.has(person.id) &&
                (previous.get(person.id)?.entryRole ?? 'visitor') !== (person.entryRole ?? 'visitor'),
        ),
        removals: originalPeople.filter((person) => !nextIds.has(person.id)).map((person) => person.id),
    }
}
