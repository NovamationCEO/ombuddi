import { describe, expect, it } from 'vitest'
import { resolvePhrase } from './phraseSource'

describe('resolvePhrase', () => {
    it('requires Blank to be explicit when no session default exists', () => {
        expect(resolvePhrase('default', null, '')).toBeNull()
        expect(resolvePhrase('blank', null, '')).toBe('')
    })

    it('keeps a custom phrase separate from the session default', () => {
        expect(resolvePhrase('custom', 'session phrase', 'one-time phrase')).toBe('one-time phrase')
        expect(resolvePhrase('default', 'session phrase', 'one-time phrase')).toBe('session phrase')
    })
})
