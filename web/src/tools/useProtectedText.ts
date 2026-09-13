import React from 'react'
import { decryptProtectedText, isEncrypted } from './notesCrypto'
import { PhraseSource, resolvePhrase } from './phraseSource'
import { useSessionSalt } from '../libraries/useSessionSalt'

export type ProtectedTextStatus = 'plain' | 'awaiting-phrase' | 'decrypting' | 'failed' | 'decrypted'

export function useProtectedText(
    stored: string,
    organizationId: string,
    source: PhraseSource,
    customPhrase: string,
    options: { tryLegacyBlank?: boolean; attemptKey?: number } = {},
) {
    const { tryLegacyBlank = false, attemptKey = 0 } = options
    const defaultPhrase = useSessionSalt((state) => state.sessionSalt)
    const encrypted = isEncrypted(stored)
    const [plaintext, setPlaintext] = React.useState<string | null>(encrypted ? null : stored)
    const [status, setStatus] = React.useState<ProtectedTextStatus>(encrypted ? 'awaiting-phrase' : 'plain')
    const itemIdentity = `${organizationId}\u0000${stored}`
    const previousIdentity = React.useRef(itemIdentity)

    React.useEffect(() => {
        if (previousIdentity.current === itemIdentity) return
        previousIdentity.current = itemIdentity
        setPlaintext(encrypted ? null : stored)
        setStatus(encrypted ? 'awaiting-phrase' : 'plain')
    }, [encrypted, itemIdentity, stored])

    React.useEffect(() => {
        if (!encrypted || plaintext !== null || !organizationId) return
        const selectedPhrase = resolvePhrase(source, defaultPhrase, customPhrase)
        const phrases =
            tryLegacyBlank && source === 'default'
                ? selectedPhrase === null
                    ? ['']
                    : [selectedPhrase, '']
                : selectedPhrase === null
                  ? []
                  : [selectedPhrase]
        if (!phrases.length) {
            setStatus('awaiting-phrase')
            return
        }

        let active = true
        setStatus('decrypting')
        void (async () => {
            for (const phrase of phrases) {
                const result = await decryptProtectedText(stored, phrase, organizationId)
                if (!active) return
                if (result !== null) {
                    setPlaintext(result)
                    setStatus('decrypted')
                    return
                }
            }
            if (active) {
                setStatus('failed')
            }
        })()
        return () => {
            active = false
        }
    }, [attemptKey, customPhrase, defaultPhrase, encrypted, organizationId, plaintext, source, stored, tryLegacyBlank])

    return { encrypted, plaintext, status }
}
