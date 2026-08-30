import React from 'react'
import { useSessionSalt } from '../libraries/useSessionSalt'

export type PhraseSource = 'blank' | 'default' | 'custom'

export function resolvePhrase(
    source: PhraseSource,
    defaultPhrase: string | null,
    customPhrase: string,
): string | null {
    if (source === 'blank') return ''
    if (source === 'default') return defaultPhrase?.length ? defaultPhrase : null
    return customPhrase.length ? customPhrase : null
}

export function usePhraseSelection(initialSource: PhraseSource = 'default') {
    const defaultPhrase = useSessionSalt((state) => state.sessionSalt)
    const [source, setSource] = React.useState<PhraseSource>(initialSource)
    const [customPhrase, setCustomPhrase] = React.useState('')
    const phrase = resolvePhrase(source, defaultPhrase, customPhrase)

    return {
        source,
        setSource,
        customPhrase,
        setCustomPhrase,
        defaultPhrase,
        phrase,
    }
}
