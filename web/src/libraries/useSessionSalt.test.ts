import { beforeEach, describe, expect, it } from 'vitest'
import { useSessionSalt } from './useSessionSalt'

describe('useSessionSalt', () => {
    beforeEach(() => {
        useSessionSalt.getState().clearSessionSalt()
    })

    it('keeps a phrase only until the session state is cleared', () => {
        useSessionSalt.getState().setSessionSalt('temporary phrase')

        expect(useSessionSalt.getState().sessionSalt).toBe('temporary phrase')

        useSessionSalt.getState().clearSessionSalt()

        expect(useSessionSalt.getState().sessionSalt).toBeNull()
    })
})
