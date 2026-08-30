import {
    Box,
    Stack,
    TextField,
    ToggleButton,
    ToggleButtonGroup,
    Typography,
} from '@mui/material'
import { useSessionSalt } from '../libraries/useSessionSalt'
import { PhraseSource } from '../tools/phraseSource'

export function PhraseSourceControl(props: {
    source: PhraseSource
    onSourceChange: (source: PhraseSource) => void
    customPhrase: string
    onCustomPhraseChange: (phrase: string) => void
    customLabel?: string
    purpose?: 'encrypt' | 'decrypt' | 'lookup'
    compact?: boolean
}) {
    const {
        source,
        onSourceChange,
        customPhrase,
        onCustomPhraseChange,
        customLabel = 'Free text',
        purpose = 'encrypt',
        compact = false,
    } = props
    const defaultPhrase = useSessionSalt((state) => state.sessionSalt)
    const setDefaultPhrase = useSessionSalt((state) => state.setSessionSalt)
    const action = purpose === 'lookup' ? 'lookup' : purpose === 'decrypt' ? 'decryption' : 'encryption'

    return (
        <Box onClick={(event) => event.stopPropagation()} sx={{ minWidth: 0 }}>
            <Stack spacing={compact ? 0.75 : 1}>
                <ToggleButtonGroup
                    exclusive
                    size="small"
                    value={source}
                    onChange={(_event, value: PhraseSource | null) => {
                        if (value) onSourceChange(value)
                    }}
                    aria-label={`Phrase used for ${action}`}
                    sx={{ alignSelf: 'flex-start', flexWrap: 'wrap' }}
                >
                    <ToggleButton value="blank">Blank</ToggleButton>
                    <ToggleButton value="default">Default Salt</ToggleButton>
                    <ToggleButton value="custom">{customLabel}</ToggleButton>
                </ToggleButtonGroup>

                {source === 'default' && (
                    <TextField
                        type="password"
                        size="small"
                        label="Session default Salt"
                        value={defaultPhrase ?? ''}
                        onChange={(event) => setDefaultPhrase(event.target.value)}
                        autoComplete="off"
                        error={!defaultPhrase?.length}
                        helperText={defaultPhrase?.length
                            ? `Editing this changes the session default for ${action}.`
                            : 'No session default is set. Enter one here or explicitly choose Blank.'}
                        fullWidth
                    />
                )}

                {source === 'custom' && (
                    <TextField
                        type="password"
                        size="small"
                        label={customLabel}
                        value={customPhrase}
                        onChange={(event) => onCustomPhraseChange(event.target.value)}
                        autoComplete="off"
                        error={!customPhrase.length}
                        helperText="Used only for this item; it does not change the session default."
                        fullWidth
                    />
                )}

                {source === 'blank' && (
                    <Typography variant="caption" color="warning.main">
                        Blank is intentional and provides no phrase-based protection beyond organization separation.
                    </Typography>
                )}
            </Stack>
        </Box>
    )
}
