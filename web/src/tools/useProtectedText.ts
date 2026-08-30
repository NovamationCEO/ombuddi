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
) {
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
        const phrase = resolvePhrase(source, defaultPhrase, customPhrase)
        if (phrase === null) {
            setStatus('awaiting-phrase')
            return
        }

        let active = true
        setStatus('decrypting')
        void decryptProtectedText(stored, phrase, organizationId).then((result) => {
            if (!active) return
            if (result === null) {
                setStatus('failed')
                return
            }
            setPlaintext(result)
            setStatus('decrypted')
        })
        return () => {
            active = false
        }
    }, [customPhrase, defaultPhrase, encrypted, organizationId, plaintext, source, stored])

    return { encrypted, plaintext, status }
}
