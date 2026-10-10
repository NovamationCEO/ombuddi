import { Visibility, VisibilityOff } from '@mui/icons-material'
import {
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

// Mount only while open so drafts and visibility reset on every visit.
export function DefaultPhraseDialog({ onClose }: { onClose: () => void }) {
    const { sessionSalt, setSessionSalt, clearSessionSalt } = useSessionSalt()
    const [draft, setDraft] = useState(sessionSalt ?? '')
    const [visible, setVisible] = useState(false)

    return (
        <Dialog
            open
            onClose={onClose}
            maxWidth="xs"
            fullWidth
            aria-labelledby="default-phrase-title"
        >
            <Box
                component="form"
                onSubmit={(event) => {
                    event.preventDefault()
                    if (!draft) return
                    setSessionSalt(draft)
                    onClose()
                }}
            >
                <DialogTitle id="default-phrase-title">Default Encryption Phrase</DialogTitle>
                <DialogContent>
                    <Stack
                        spacing={2}
                        sx={{ pt: 0.5 }}
                    >
                        <Typography
                            variant="body2"
                            color="text.secondary"
                        >
                            Tried first when opening protected text, and suggested when protecting something new.
                        </Typography>
                        <TextField
                            label="Phrase"
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
                        <Typography
                            variant="caption"
                            color="text.secondary"
                        >
                            Kept only until refresh or sign out. Changing it does not change the phrase on existing
                            records.
                        </Typography>
                    </Stack>
                </DialogContent>
                <DialogActions sx={{ px: 3, pb: 2 }}>
                    <Button
                        disabled={!sessionSalt}
                        onClick={() => {
                            clearSessionSalt()
                            onClose()
                        }}
                        sx={{ mr: 'auto' }}
                    >
                        Clear
                    </Button>
                    <Button onClick={onClose}>Cancel</Button>
                    <Button
                        type="submit"
                        variant="contained"
                        disabled={!draft}
                    >
                        Save
                    </Button>
                </DialogActions>
            </Box>
        </Dialog>
    )
}
