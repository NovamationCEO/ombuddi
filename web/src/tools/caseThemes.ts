export const schoolThemes = [
    'Advising Issues',
    'Staff/Faculty Conflict',
    'Staff/Administration Conflict',
    'Student/Faculty Conflict',
    'Supervising Conflict',
    'Title IX',
    'Equity Issues',
    'Job Insecurity',
]

export function normalizeCaseThemes(values: string[], options: string[] = []) {
    const seen = new Set<string>()
    return values
        .map((value) => value.trim().replace(/\s+/g, ' '))
        .filter((value) => {
            const key = value.toLowerCase()
            if (!value || seen.has(key)) return false
            seen.add(key)
            return true
        })
        .map((value) => options.find((option) => option.toLowerCase() === value.toLowerCase()) ?? value)
}
