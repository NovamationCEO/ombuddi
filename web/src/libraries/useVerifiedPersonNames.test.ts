import { beforeEach, describe, expect, it } from 'vitest'
import { useVerifiedPersonNames } from './useVerifiedPersonNames'

describe('useVerifiedPersonNames', () => {
    beforeEach(() => useVerifiedPersonNames.getState().clearVerifiedNames())

    it('keeps verified names in memory and clears them together', () => {
        useVerifiedPersonNames.getState().setVerifiedName('person-1', 'Jordan Lee')
        useVerifiedPersonNames.getState().setVerifiedName('person-2', 'Morgan Chen')

        expect(useVerifiedPersonNames.getState().names).toEqual({
            'person-1': 'Jordan Lee',
            'person-2': 'Morgan Chen',
        })

        useVerifiedPersonNames.getState().clearVerifiedNames()
        expect(useVerifiedPersonNames.getState().names).toEqual({})
    })
})
