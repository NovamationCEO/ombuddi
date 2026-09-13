import { describe, expect, it } from 'vitest'
import { calendarDateInputValue, formatCalendarDate, localCalendarDateInputValue } from './calendarDate'

describe('calendar dates', () => {
    it('preserves ISO database dates without a timezone shift', () => {
        expect(calendarDateInputValue('2026-09-13')).toBe('2026-09-13')
        expect(calendarDateInputValue('2026-09-13T00:00:00.000Z')).toBe('2026-09-13')
    })

    it('normalizes Flask RFC date serialization as the same calendar day', () => {
        expect(calendarDateInputValue('Sat, 12 Sep 2026 00:00:00 GMT')).toBe('2026-09-12')
    })

    it('uses the local day rather than the UTC day for a new entry default', () => {
        expect(localCalendarDateInputValue(new Date(2026, 8, 12, 22, 30))).toBe('2026-09-12')
    })

    it('formats a database date without moving it into the prior local day', () => {
        const formatted = formatCalendarDate('2026-09-13', {
            month: 'numeric',
            day: 'numeric',
            year: 'numeric',
        })
        expect(formatted).toMatch(/9\/13\/2026|13\/9\/2026|2026\/9\/13/)
    })
})
