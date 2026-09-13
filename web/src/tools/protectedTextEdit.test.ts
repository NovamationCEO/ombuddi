import { describe, expect, it } from 'vitest'
import { decryptProtectedText, encryptProtectedText } from './notesCrypto'
import { protectedTextForSave } from './protectedTextEdit'

const organizationId = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'

describe('protectedTextForSave', () => {
    it('preserves unchanged encrypted storage byte-for-byte', async () => {
        const stored = await encryptProtectedText('original', 'old phrase ', organizationId)
        await expect(protectedTextForSave({
            stored,
            originalPlaintext: 'original',
            editedPlaintext: 'original',
            unlockPhrase: 'old phrase ',
            replaceProtection: false,
            replacementPhrase: 'accidental default',
            organizationId,
        })).resolves.toBe(stored)
    })

    it('uses the successful unlock phrase when encrypted text changes', async () => {
        const stored = await encryptProtectedText('original', 'old phrase ', organizationId)
        const saved = await protectedTextForSave({
            stored,
            originalPlaintext: 'original',
            editedPlaintext: 'edited',
            unlockPhrase: 'old phrase ',
            replaceProtection: false,
            replacementPhrase: 'different phrase',
            organizationId,
        })
        await expect(decryptProtectedText(saved, 'old phrase ', organizationId)).resolves.toBe('edited')
        await expect(decryptProtectedText(saved, 'different phrase', organizationId)).resolves.toBeNull()
    })

    it('only changes the phrase when replacement is explicit', async () => {
        const stored = await encryptProtectedText('original', 'old phrase', organizationId)
        const saved = await protectedTextForSave({
            stored,
            originalPlaintext: 'original',
            editedPlaintext: 'original',
            unlockPhrase: 'old phrase',
            replaceProtection: true,
            replacementPhrase: 'new phrase ',
            organizationId,
        })
        await expect(decryptProtectedText(saved, 'new phrase ', organizationId)).resolves.toBe('original')
        await expect(decryptProtectedText(saved, 'old phrase', organizationId)).resolves.toBeNull()
    })

    it('refuses to save newly added text as plaintext', async () => {
        await expect(protectedTextForSave({
            stored: '',
            originalPlaintext: '',
            editedPlaintext: 'new protected note',
            unlockPhrase: '',
            replaceProtection: false,
            replacementPhrase: null,
            organizationId,
        })).rejects.toThrow('Choose protection')
    })

    it('encrypts edited legacy plaintext after protection is explicitly selected', async () => {
        const saved = await protectedTextForSave({
            stored: 'legacy text',
            originalPlaintext: 'legacy text',
            editedPlaintext: 'edited text',
            unlockPhrase: '',
            replaceProtection: true,
            replacementPhrase: 'new phrase',
            organizationId,
        })

        expect(saved).not.toBe('edited text')
        await expect(decryptProtectedText(saved, 'new phrase', organizationId)).resolves.toBe('edited text')
    })
})
