type CalendarDateSource = Date | string | null | undefined

function pad(value: number): string {
    return String(value).padStart(2, '0')
}

/** Normalize a database DATE without applying the browser's local timezone. */
export function calendarDateInputValue(value: CalendarDateSource): string | null {
    if (!value) return null
    if (typeof value === 'string') {
        const datePrefix = value.match(/^(\d{4}-\d{2}-\d{2})(?:$|T|\s)/)?.[1]
        if (datePrefix) return datePrefix
    }

    const parsed = value instanceof Date ? value : new Date(value)
    if (Number.isNaN(parsed.getTime())) return null
    return `${parsed.getUTCFullYear()}-${pad(parsed.getUTCMonth() + 1)}-${pad(parsed.getUTCDate())}`
}

/** Today's local calendar day, suitable for an input[type=date] default. */
export function localCalendarDateInputValue(value = new Date()): string {
    return `${value.getFullYear()}-${pad(value.getMonth() + 1)}-${pad(value.getDate())}`
}

export function formatCalendarDate(
    value: CalendarDateSource,
    options: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric', year: 'numeric' },
): string {
    const inputValue = calendarDateInputValue(value)
    if (!inputValue) return '—'
    return new Date(`${inputValue}T00:00:00.000Z`).toLocaleDateString(undefined, {
        ...options,
        timeZone: 'UTC',
    })
}
