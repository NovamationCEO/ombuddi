import React from 'react'
import { useSessionSalt } from '../libraries/useSessionSalt'

export type PhraseSource = 'blank' | 'default' | 'custom'

export function resolvePhrase(source: PhraseSource, defaultPhrase: string | null, customPhrase: string): string | null {
    if (source === 'blank') return ''
    if (source === 'default') return defaultPhrase?.length ? defaultPhrase : null
    return customPhrase.length ? customPhrase : null
}

export function usePhraseSelection(initialSource: PhraseSource = 'default', requireDefaultConfirmation = false) {
    const defaultPhrase = useSessionSalt((state) => state.sessionSalt)
    const [source, setSource] = React.useState<PhraseSource>(initialSource)
    const [customPhrase, setCustomPhrase] = React.useState('')
    const [confirmedDefault, setConfirmedDefault] = React.useState<string | null>(null)
    const defaultConfirmed = defaultPhrase !== null && confirmedDefault === defaultPhrase
    const phrase =
        source === 'default' && requireDefaultConfirmation && !defaultConfirmed
            ? null
            : resolvePhrase(source, defaultPhrase, customPhrase)

    return {
        source,
        setSource,
        customPhrase,
        setCustomPhrase,
        defaultPhrase,
        defaultConfirmed,
        confirmDefault: () => setConfirmedDefault(defaultPhrase),
        phrase,
    }
}
