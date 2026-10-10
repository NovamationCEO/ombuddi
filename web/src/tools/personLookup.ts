import type { PersonType } from '../types/majorTypes'
import { getter } from './db_tools/getter'
import { hashPersonName } from './useHashName'

export type PersonCredentials = { name: string; phrase: string }

export async function findPeople(credentials: PersonCredentials, organizationId: string): Promise<PersonType[]> {
    const name = credentials.name.trim()
    if (!name || !organizationId) throw new Error('Enter a full name before searching.')
    const hash = hashPersonName(name, credentials.phrase, organizationId)
    const [privatePeople, publicPeople] = await Promise.all([
        getter<PersonType[]>(`get_persons_by_hashed_name/${hash}`),
        getter<PersonType[]>(`search_public_persons/${organizationId}/${encodeURIComponent(name)}`),
    ])
    return [...new Map([...privatePeople, ...publicPeople].map((person) => [person.id, person])).values()]
}
