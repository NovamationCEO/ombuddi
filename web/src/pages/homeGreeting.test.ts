import { describe, expect, it } from 'vitest'
import { getTimeOfDayGreeting } from './homeGreeting'

describe('getTimeOfDayGreeting', () => {
    it('uses a morning greeting from 5:00 through 11:59', () => {
        expect(getTimeOfDayGreeting(5)).toBe('Good morning')
        expect(getTimeOfDayGreeting(11)).toBe('Good morning')
    })

    it('uses an afternoon greeting from noon through 16:59', () => {
        expect(getTimeOfDayGreeting(12)).toBe('Good afternoon')
        expect(getTimeOfDayGreeting(16)).toBe('Good afternoon')
    })

    it('uses an evening greeting overnight and after 17:00', () => {
        expect(getTimeOfDayGreeting(17)).toBe('Good evening')
        expect(getTimeOfDayGreeting(4)).toBe('Good evening')
    })
})
