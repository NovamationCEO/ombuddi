import { describe, expect, it } from 'vitest'
import { referralSelectionsAreValid } from './referralSources'

describe('referralSelectionsAreValid', () => {
    it('requires non-whitespace detail for Other even when detail is omitted', () => {
        expect(referralSelectionsAreValid([
            { id: 'other', behavior: 'other_detail' },
        ])).toBe(false)
        expect(referralSelectionsAreValid([
            { id: 'other', behavior: 'other_detail', detail: '   ' },
        ])).toBe(false)
        expect(referralSelectionsAreValid([
            { id: 'other', behavior: 'other_detail', detail: 'Professional association' },
        ])).toBe(true)
    })

    it('does not require detail for ordinary or exclusive choices', () => {
        expect(referralSelectionsAreValid([
            { id: 'hr', behavior: 'standard' },
            { id: 'unknown', behavior: 'exclusive' },
        ])).toBe(true)
    })
})
