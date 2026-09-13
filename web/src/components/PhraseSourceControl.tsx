import {
    Alert,
    Box,
    Button,
    Stack,
    TextField,
    ToggleButton,
    ToggleButtonGroup,
    Typography,
} from '@mui/material'
import React from 'react'
import { useSessionSalt } from '../libraries/useSessionSalt'
import { PhraseSource } from '../tools/phraseSource'

export function PhraseSourceControl(props: {
    source: PhraseSource
    onSourceChange: (source: PhraseSource) => void
    customPhrase: string
    onCustomPhraseChange: (phrase: string) => void
    customLabel?: string
    purpose?: 'encrypt' | 'decrypt' | 'lookup'
    phraseIsNew?: boolean
    compact?: boolean
}) {
    const {
        source,
        onSourceChange,
        customPhrase,
        onCustomPhraseChange,
        customLabel = 'Free text',
        purpose = 'encrypt',
        phraseIsNew = purpose === 'encrypt',
        compact = false,
    } = props
    const defaultPhrase = useSessionSalt((state) => state.sessionSalt)
    const setDefaultPhrase = useSessionSalt((state) => state.setSessionSalt)
    const [replacingDefault, setReplacingDefault] = React.useState(false)
    const [defaultDraft, setDefaultDraft] = React.useState('')
    const action = purpose === 'lookup' ? 'lookup' : purpose === 'decrypt' ? 'decryption' : 'encryption'
    const phraseInputType = phraseIsNew ? 'text' : 'password'
    const visibilityGuidance = phraseIsNew ? 'Visible to prevent mistyping. ' : ''

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

                {source === 'default' && defaultPhrase && !replacingDefault && (
                    <Stack spacing={0.5} sx={{ alignItems: 'flex-start' }}>
                        <Typography variant="body2" sx={{ fontWeight: 650 }}>
                            Using session default
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                            The saved phrase is not displayed. Spaces in it remain significant.
                        </Typography>
                        <Button
                            type="button"
                            size="small"
                            onClick={() => {
                                setDefaultDraft('')
                                setReplacingDefault(true)
                            }}
                        >
                            Replace session default
                        </Button>
                    </Stack>
                )}

                {source === 'default' && (!defaultPhrase || replacingDefault) && (
                    <Stack spacing={1}>
                        {replacingDefault && (
                            <Alert severity="warning">
                                This changes future {action} choices throughout this session. Existing records are
                                unchanged, and exact spaces count.
                            </Alert>
                        )}
                        <TextField
                            type="text"
                            size="small"
                            label="New session default phrase"
                            value={defaultDraft}
                            onChange={(event) => setDefaultDraft(event.target.value)}
                            autoComplete="off"
                            error={!defaultDraft.length}
                            helperText="Visible while entering to prevent a hidden mistype."
                            fullWidth
                            slotProps={{
                                htmlInput: {
                                    'data-1p-ignore': '',
                                    'data-op-ignore': '',
                                },
                            }}
                        />
                        <Stack direction="row" spacing={1}>
                            <Button
                                type="button"
                                variant="outlined"
                                size="small"
                                disabled={!defaultDraft.length}
                                onClick={() => {
                                    setDefaultPhrase(defaultDraft)
                                    setDefaultDraft('')
                                    setReplacingDefault(false)
                                }}
                            >
                                Save session default
                            </Button>
                            {replacingDefault && (
                                <Button
                                    type="button"
                                    size="small"
                                    onClick={() => {
                                        setDefaultDraft('')
                                        setReplacingDefault(false)
                                    }}
                                >
                                    Cancel
                                </Button>
                            )}
                        </Stack>
                    </Stack>
                )}

                {source === 'custom' && (
                    <TextField
                        type={phraseInputType}
                        size="small"
                        label={customLabel}
                        value={customPhrase}
                        onChange={(event) => onCustomPhraseChange(event.target.value)}
                        autoComplete="off"
                        error={!customPhrase.length}
                        helperText={`${visibilityGuidance}Used only for this item; exact spaces count and the session default is unchanged.`}
                        fullWidth
                        slotProps={{
                            htmlInput: {
                                'data-1p-ignore': '',
                                'data-op-ignore': '',
                            },
                        }}
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
