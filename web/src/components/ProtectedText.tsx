import { Alert, Box, Stack, Typography } from '@mui/material'
import React from 'react'
import { PhraseSourceControl } from './PhraseSourceControl'
import { usePhraseSelection } from '../tools/phraseSource'
import { useProtectedText } from '../tools/useProtectedText'

export function ProtectedText(props: {
    stored: string
    organizationId: string
    emptyText?: string
    compact?: boolean
    onDecrypted?: (plaintext: string) => void
}) {
    const { stored, organizationId, emptyText = 'No text recorded.', compact = false, onDecrypted } = props
    const phrase = usePhraseSelection()
    const result = useProtectedText(stored, organizationId, phrase.source, phrase.customPhrase)

    React.useEffect(() => {
        if (result.plaintext !== null) onDecrypted?.(result.plaintext)
    }, [onDecrypted, result.plaintext])

    if (!result.encrypted) {
        return <Typography sx={{ whiteSpace: 'pre-wrap' }}>{result.plaintext || emptyText}</Typography>
    }

    return (
        <Stack spacing={compact ? 0.75 : 1.25}>
            {result.plaintext !== null ? (
                <Typography sx={{ whiteSpace: 'pre-wrap' }}>{result.plaintext || emptyText}</Typography>
            ) : result.status === 'failed' ? (
                <Alert severity="warning">
                    Unable to decrypt this text. Try Blank, edit the Default Salt, or provide a one-time override.
                </Alert>
            ) : (
                <Typography variant="body2" color="text.secondary">
                    {result.status === 'decrypting' ? 'Decrypting…' : 'Choose the phrase source to decrypt this text.'}
                </Typography>
            )}
            <Box sx={{ maxWidth: compact ? 520 : 680 }}>
                <PhraseSourceControl
                    source={phrase.source}
                    onSourceChange={phrase.setSource}
                    customPhrase={phrase.customPhrase}
                    onCustomPhraseChange={phrase.setCustomPhrase}
                    customLabel="One-time override"
                    purpose="decrypt"
                    compact={compact}
                />
            </Box>
        </Stack>
    )
}
