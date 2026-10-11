export const entryRoles = [
    { value: 'visitor', label: 'Visitor', description: 'Seeking help or support. Counts in visitor reports.' },
    { value: 'referenced', label: 'Referenced', description: 'Mentioned in the concern or discussion.' },
    { value: 'consulted', label: 'Consulted', description: 'Providing information, expertise, or assistance.' },
    {
        value: 'support_person',
        label: 'Support person',
        description: 'Accompanying or supporting a visitor, such as an interpreter.',
    },
    {
        value: 'participant',
        label: 'Participant',
        description: 'Taking part in a facilitated conversation without independently seeking help.',
    },
    { value: 'other', label: 'Other', description: 'Involved in another capacity.' },
] as const

export type EntryRole = (typeof entryRoles)[number]['value']

export function entryRoleLabel(role: EntryRole = 'visitor') {
    return entryRoles.find((option) => option.value === role)?.label ?? 'Visitor'
}
