import { LockOutlined } from '@mui/icons-material'
import {
    Box,
    Button,
    CircularProgress,
    Divider,
    IconButton,
    Popover,
    Stack,
    TextField,
    Tooltip,
    Typography,
} from '@mui/material'
import React from 'react'
import { usePhraseSelection } from '../tools/phraseSource'
import { useProtectedText } from '../tools/useProtectedText'
import { useSessionSalt } from '../libraries/useSessionSalt'

export function ProtectedText(props: {
    stored: string
    organizationId: string
    emptyText?: string
    compact?: boolean
    onDecrypted?: (plaintext: string, phraseUsed: string) => void
}) {
    const { stored, organizationId, emptyText = 'No text recorded.', compact = false, onDecrypted } = props
    const phrase = usePhraseSelection()
    const recoveryId = React.useId()
    const setSessionSalt = useSessionSalt((state) => state.setSessionSalt)
    const [anchorElement, setAnchorElement] = React.useState<HTMLElement | null>(null)
    const [oneTimeDraft, setOneTimeDraft] = React.useState('')
    const [defaultDraft, setDefaultDraft] = React.useState(phrase.defaultPhrase ?? '')
    const [attemptKey, setAttemptKey] = React.useState(0)
    const [attemptedMode, setAttemptedMode] = React.useState<'one-time' | 'default' | null>(null)
    const result = useProtectedText(stored, organizationId, phrase.source, phrase.customPhrase, {
        tryLegacyBlank: true,
        attemptKey,
    })

    React.useEffect(() => {
        if (result.plaintext !== null && result.phraseUsed !== null) {
            onDecrypted?.(result.plaintext, result.phraseUsed)
            setAnchorElement(null)
        }
    }, [onDecrypted, result.phraseUsed, result.plaintext])

    function openRecovery(event: React.MouseEvent<HTMLElement>) {
        setOneTimeDraft('')
        setDefaultDraft(phrase.defaultPhrase ?? '')
        setAttemptedMode(null)
        setAnchorElement(event.currentTarget)
    }

    function tryOneTimePhrase(event: React.FormEvent) {
        event.preventDefault()
        if (!oneTimeDraft) return
        phrase.setCustomPhrase(oneTimeDraft)
        phrase.setSource('custom')
        setAttemptedMode('one-time')
        setAttemptKey((key) => key + 1)
    }

    function replaceDefaultPhrase(event: React.FormEvent) {
        event.preventDefault()
        if (!defaultDraft) return
        setSessionSalt(defaultDraft)
        phrase.setSource('default')
        setAttemptedMode('default')
        setAttemptKey((key) => key + 1)
    }

    if (!result.encrypted) {
        return <Typography sx={{ whiteSpace: 'pre-wrap' }}>{result.plaintext || emptyText}</Typography>
    }

    if (result.plaintext !== null) {
        return <Typography sx={{ whiteSpace: 'pre-wrap' }}>{result.plaintext || emptyText}</Typography>
    }

    const attemptFailed = attemptedMode !== null && result.status === 'failed'

    return (
        <Box sx={{ display: 'inline-flex' }}>
            <Tooltip title="Unlock protected text">
                <span>
                    <IconButton
                        size={compact ? 'small' : 'medium'}
                        onClick={openRecovery}
                        aria-label="Unlock protected text"
                        aria-haspopup="dialog"
                        aria-expanded={Boolean(anchorElement)}
                        aria-controls={anchorElement ? recoveryId : undefined}
                        disabled={result.status === 'decrypting'}
                        sx={{ color: 'inherit' }}
                    >
                        {result.status === 'decrypting' ? (
                            <CircularProgress
                                size={20}
                                color="inherit"
                            />
                        ) : (
                            <LockOutlined />
                        )}
                    </IconButton>
                </span>
            </Tooltip>

            <Popover
                open={Boolean(anchorElement)}
                anchorEl={anchorElement}
                onClose={() => setAnchorElement(null)}
                anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
                transformOrigin={{ vertical: 'top', horizontal: 'left' }}
                slotProps={{
                    paper: {
                        id: recoveryId,
                        role: 'dialog',
                        'aria-label': 'Unlock protected text',
                        sx: { width: 'min(380px, calc(100vw - 32px))', p: 2.25, borderRadius: 2 },
                    },
                }}
            >
                <Stack spacing={2}>
                    <Box>
                        <Typography sx={{ fontWeight: 700 }}>Unlock protected text</Typography>
                        <Typography
                            variant="body2"
                            color="text.secondary"
                            sx={{ mt: 0.4 }}
                        >
                            {phrase.defaultPhrase
                                ? 'The current session default did not unlock this item.'
                                : 'No session default is set for this protected item.'}
                        </Typography>
                    </Box>

                    <Box
                        component="form"
                        onSubmit={tryOneTimePhrase}
                    >
                        <Stack spacing={1}>
                            <Typography
                                variant="body2"
                                sx={{ fontWeight: 650 }}
                            >
                                Try once
                            </Typography>
                            <TextField
                                type="password"
                                size="small"
                                label="One-time phrase"
                                value={oneTimeDraft}
                                onChange={(event) => {
                                    setOneTimeDraft(event.target.value)
                                    setAttemptedMode(null)
                                }}
                                autoComplete="off"
                                autoFocus
                                fullWidth
                                slotProps={{
                                    htmlInput: {
                                        'aria-label': 'One-time phrase',
                                        'data-1p-ignore': '',
                                        'data-op-ignore': '',
                                    },
                                }}
                            />
                            <Button
                                type="submit"
                                variant="contained"
                                size="small"
                                disabled={!oneTimeDraft || result.status === 'decrypting'}
                            >
                                Try phrase
                            </Button>
                        </Stack>
                    </Box>

                    <Divider>or</Divider>

                    <Box
                        component="form"
                        onSubmit={replaceDefaultPhrase}
                    >
                        <Stack spacing={1}>
                            <Typography
                                variant="body2"
                                sx={{ fontWeight: 650 }}
                            >
                                Replace the session default
                            </Typography>
                            <Typography
                                variant="caption"
                                color="text.secondary"
                            >
                                This changes the phrase used for future protected notes and person lookups until
                                refresh or logout. It does not re-encrypt existing records. Spaces are significant.
                            </Typography>
                            <TextField
                                type="text"
                                size="small"
                                label="New session default"
                                value={defaultDraft}
                                onChange={(event) => {
                                    setDefaultDraft(event.target.value)
                                    setAttemptedMode(null)
                                }}
                                autoComplete="off"
                                fullWidth
                                slotProps={{
                                    htmlInput: {
                                        'aria-label': 'New session default',
                                        'data-1p-ignore': '',
                                        'data-op-ignore': '',
                                    },
                                }}
                            />
                            <Button
                                type="submit"
                                variant="outlined"
                                size="small"
                                disabled={!defaultDraft || result.status === 'decrypting'}
                            >
                                Save and try
                            </Button>
                        </Stack>
                    </Box>

                    {attemptFailed && (
                        <Typography
                            role="alert"
                            variant="body2"
                            color="warning.main"
                        >
                            That phrase did not unlock this item. Check the phrase and try again.
                        </Typography>
                    )}
                </Stack>
            </Popover>
        </Box>
    )
}
