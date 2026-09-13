import { encryptProtectedText, isEncrypted } from './notesCrypto'

export async function protectedTextForSave(options: {
    stored: string
    originalPlaintext: string
    editedPlaintext: string
    unlockPhrase: string | null
    replaceProtection: boolean
    replacementPhrase: string | null
    organizationId: string
}): Promise<string> {
    const {
        stored,
        originalPlaintext,
        editedPlaintext,
        unlockPhrase,
        replaceProtection,
        replacementPhrase,
        organizationId,
    } = options

    if (!replaceProtection && editedPlaintext === originalPlaintext) return stored

    if (replaceProtection) {
        if (replacementPhrase === null) throw new Error('Choose a phrase before changing note protection.')
        return editedPlaintext ? encryptProtectedText(editedPlaintext, replacementPhrase, organizationId) : ''
    }

    if (!isEncrypted(stored)) return editedPlaintext
    if (unlockPhrase === null) throw new Error('Unlock the protected text before changing it.')
    return editedPlaintext ? encryptProtectedText(editedPlaintext, unlockPhrase, organizationId) : ''
}
