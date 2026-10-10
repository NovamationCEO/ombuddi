import { ContentPasteOutlined, Visibility, VisibilityOff } from '@mui/icons-material'
import {
    Alert,
    Box,
    Button,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    IconButton,
    InputAdornment,
    Stack,
    TextField,
    Typography,
} from '@mui/material'
import { useState } from 'react'
import { useSessionSalt } from '../libraries/useSessionSalt'

export type NoteEncryptionChoice = { mode: 'encrypted'; phrase: string } | { mode: 'none' }

// Mount only while open; cancel discards the draft and every visit starts masked.
export function NoteEncryptionDialog({
    choice,
    saveOnConfirm,
    onConfirm,
    onClose,
}: {
    choice: NoteEncryptionChoice | null
    saveOnConfirm: boolean
    onConfirm: (choice: NoteEncryptionChoice) => void
    onClose: () => void
}) {
    const defaultPhrase = useSessionSalt((state) => state.sessionSalt)
    const [draft, setDraft] = useState(choice?.mode === 'encrypted' ? choice.phrase : '')
    const [visible, setVisible] = useState(false)
    const [turningOff, setTurningOff] = useState(false)
    return (
        <Dialog
            open
            onClose={onClose}
            maxWidth="xs"
            fullWidth
            aria-labelledby="note-encryption-title"
        >
            <Box
                component="form"
                onSubmit={(event) => {
                    event.preventDefault()
                    if (!turningOff && draft.length) onConfirm({ mode: 'encrypted', phrase: draft })
                }}
            >
                <DialogTitle id="note-encryption-title">Encryption Phrase</DialogTitle>
                <DialogContent>
                    {turningOff ? (
                        <Alert severity="warning">
                            This note will be stored without phrase encryption. Organization access controls still
                            apply.
                        </Alert>
                    ) : (
                        <Stack
                            spacing={2}
                            sx={{ pt: 0.5 }}
                        >
                            <Typography
                                variant="body2"
                                color="text.secondary"
                            >
                                Choose the phrase you’ll use to unlock this note. Keep it somewhere safe; it cannot be
                                recovered.
                            </Typography>
                            <TextField
                                label="Encryption Phrase"
                                type={visible ? 'text' : 'password'}
                                value={draft}
                                onChange={(event) => setDraft(event.target.value)}
                                autoFocus
                                autoComplete="off"
                                fullWidth
                                slotProps={{
                                    htmlInput: { 'data-1p-ignore': '', 'data-op-ignore': '' },
                                    input: {
                                        endAdornment: (
                                            <InputAdornment position="end">
                                                <IconButton
                                                    type="button"
                                                    aria-label={visible ? 'Hide phrase' : 'Show phrase'}
                                                    onClick={() => setVisible((value) => !value)}
                                                    onMouseDown={(event) => event.preventDefault()}
                                                    edge="end"
                                                >
                                                    {visible ? <VisibilityOff /> : <Visibility />}
                                                </IconButton>
                                            </InputAdornment>
                                        ),
                                    },
                                }}
                            />
                            <Button
                                type="button"
                                variant="outlined"
                                startIcon={<ContentPasteOutlined />}
                                disabled={!defaultPhrase}
                                onClick={() => setDraft(defaultPhrase ?? '')}
                                sx={{ alignSelf: 'flex-start' }}
                            >
                                Copy default phrase
                            </Button>
                            <Button
                                type="button"
                                color="warning"
                                onClick={() => setTurningOff(true)}
                                sx={{ alignSelf: 'flex-start' }}
                            >
                                Turn off encryption
                            </Button>
                        </Stack>
                    )}
                </DialogContent>
                <DialogActions sx={{ px: 3, pb: 2 }}>
                    <Button onClick={turningOff ? () => setTurningOff(false) : onClose}>
                        {turningOff ? 'Back' : 'Cancel'}
                    </Button>
                    {turningOff ? (
                        <Button
                            type="button"
                            variant="contained"
                            color="warning"
                            onClick={() => onConfirm({ mode: 'none' })}
                        >
                            {saveOnConfirm ? 'Save without encryption' : 'Turn off encryption'}
                        </Button>
                    ) : (
                        <Button
                            type="submit"
                            variant="contained"
                            disabled={!draft.length}
                        >
                            {saveOnConfirm ? 'Encrypt and save' : 'Use phrase'}
                        </Button>
                    )}
                </DialogActions>
            </Box>
        </Dialog>
    )
}
