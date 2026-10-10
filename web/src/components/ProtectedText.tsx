import { LockOutlined, Visibility, VisibilityOff } from '@mui/icons-material'
import {
    Box,
    Button,
    CircularProgress,
    IconButton,
    InputAdornment,
    Popover,
    Stack,
    TextField,
    Tooltip,
    Typography,
} from '@mui/material'
import React from 'react'
import { usePhraseSelection } from '../tools/phraseSource'
import { useProtectedText } from '../tools/useProtectedText'

export function ProtectedText(props: {
    stored: string
    organizationId: string
    emptyText?: string
    compact?: boolean
    unlockLabel?: string
    onDecrypted?: (plaintext: string, phraseUsed: string) => void
}) {
    const { stored, organizationId, emptyText = 'No text recorded.', compact = false, unlockLabel, onDecrypted } = props
    const phrase = usePhraseSelection()
    const recoveryId = React.useId()
    const [anchorElement, setAnchorElement] = React.useState<HTMLElement | null>(null)
    const [oneTimeDraft, setOneTimeDraft] = React.useState('')
    const [showPhrase, setShowPhrase] = React.useState(false)
    const [attemptKey, setAttemptKey] = React.useState(0)
    const [attempted, setAttempted] = React.useState(false)
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
        setShowPhrase(false)
        setAttempted(false)
        setAnchorElement(event.currentTarget)
    }

    function tryOneTimePhrase(event: React.FormEvent) {
        event.preventDefault()
        if (!oneTimeDraft) return
        phrase.setCustomPhrase(oneTimeDraft)
        phrase.setSource('custom')
        setAttempted(true)
        setAttemptKey((key) => key + 1)
    }

    if (!result.encrypted) {
        return <Typography sx={{ whiteSpace: 'pre-wrap' }}>{result.plaintext || emptyText}</Typography>
    }

    if (result.plaintext !== null) {
        return <Typography sx={{ whiteSpace: 'pre-wrap' }}>{result.plaintext || emptyText}</Typography>
    }

    const attemptFailed = attempted && result.status === 'failed'

    return (
        <Box sx={{ display: 'inline-flex' }}>
            {unlockLabel ? (
                <Button
                    onClick={openRecovery}
                    startIcon={
                        result.status === 'decrypting' ? (
                            <CircularProgress
                                size={18}
                                color="inherit"
                            />
                        ) : (
                            <LockOutlined />
                        )
                    }
                    aria-haspopup="dialog"
                    aria-expanded={Boolean(anchorElement)}
                    aria-controls={anchorElement ? recoveryId : undefined}
                    disabled={result.status === 'decrypting'}
                    sx={{ textDecoration: 'underline', textUnderlineOffset: '3px' }}
                >
                    {result.status === 'decrypting' ? 'Unlocking…' : unlockLabel}
                </Button>
            ) : (
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
            )}

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
                        'aria-label': 'Protected Text',
                        sx: { width: 'min(380px, calc(100vw - 32px))', p: 2.25, borderRadius: 2 },
                    },
                }}
            >
                <Stack spacing={2}>
                    <Box>
                        <Typography sx={{ fontWeight: 700 }}>Protected Text</Typography>
                        <Typography
                            variant="body2"
                            color="text.secondary"
                            sx={{ mt: 0.4 }}
                        >
                            This text is encrypted. Enter the phrase used to protect it to read it.
                        </Typography>
                    </Box>

                    <Box
                        component="form"
                        onSubmit={tryOneTimePhrase}
                    >
                        <Stack spacing={1}>
                            <TextField
                                type={showPhrase ? 'text' : 'password'}
                                size="small"
                                label="Phrase"
                                value={oneTimeDraft}
                                onChange={(event) => {
                                    setOneTimeDraft(event.target.value)
                                    setAttempted(false)
                                }}
                                autoComplete="off"
                                autoFocus
                                fullWidth
                                slotProps={{
                                    input: {
                                        endAdornment: (
                                            <InputAdornment position="end">
                                                <IconButton
                                                    type="button"
                                                    size="small"
                                                    aria-label={showPhrase ? 'Hide phrase' : 'Show phrase'}
                                                    onClick={() => setShowPhrase((shown) => !shown)}
                                                    onMouseDown={(event) => event.preventDefault()}
                                                    edge="end"
                                                >
                                                    {showPhrase ? <VisibilityOff /> : <Visibility />}
                                                </IconButton>
                                            </InputAdornment>
                                        ),
                                    },
                                    htmlInput: {
                                        'aria-label': 'Phrase',
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
                                {result.status === 'decrypting' ? 'Unlocking…' : 'Unlock'}
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
