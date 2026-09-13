import {
    Alert,
    Box,
    Button,
    Checkbox,
    CircularProgress,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    FormControlLabel,
    Stack,
    TextField,
    Typography,
} from '@mui/material'
import { useQueryClient } from '@tanstack/react-query'
import React from 'react'
import { useSessionSalt } from '../libraries/useSessionSalt'
import { useSnack } from '../libraries/useSnack'
import { updater } from '../tools/db_tools/updater'
import type { PersonType } from '../types/majorTypes'
import { hashPersonName } from '../tools/useHashName'

export function PersonPhraseChangeDialog({
    person,
    verifiedName,
    onClose,
}: {
    person: PersonType
    verifiedName: string
    onClose: () => void
}) {
    const sessionSalt = useSessionSalt((state) => state.sessionSalt)
    const setSnack = useSnack((state) => state.setSnack)
    const queryClient = useQueryClient()
    const [currentPhraseDraft, setCurrentPhraseDraft] = React.useState(sessionSalt || '')
    const [newPhraseDraft, setNewPhraseDraft] = React.useState('')
    const [confirmPhraseDraft, setConfirmPhraseDraft] = React.useState('')
    const [useBlankPhrase, setUseBlankPhrase] = React.useState(false)
    const [error, setError] = React.useState('')
    const [isChanging, setIsChanging] = React.useState(false)

    async function changePersonPhrase(event: React.FormEvent) {
        event.preventDefault()
        if (!useBlankPhrase && !newPhraseDraft) {
            setError('Enter a new phrase.')
            return
        }
        if (!useBlankPhrase && newPhraseDraft !== confirmPhraseDraft) {
            setError('The new phrases do not match.')
            return
        }

        setIsChanging(true)
        setError('')
        try {
            const replacementPhrase = useBlankPhrase ? '' : newPhraseDraft
            await updater('change_person_name_phrase', {
                id: person.id,
                currentHashedName: hashPersonName(verifiedName, currentPhraseDraft, person.organizationId),
                newHashedName: hashPersonName(verifiedName, replacementPhrase, person.organizationId),
            })
            await queryClient.invalidateQueries({ queryKey: ['get_persons_by_hashed_name'] })
            setSnack({ message: 'The person phrase was changed.', severity: 'success' })
            onClose()
        } catch (caught) {
            setError(caught instanceof Error ? caught.message : 'The person phrase could not be changed. Please try again.')
        } finally {
            setIsChanging(false)
        }
    }

    return (
        <Dialog
            open
            onClose={() => {
                if (!isChanging) onClose()
            }}
            fullWidth
            maxWidth="xs"
            aria-labelledby={`change-person-phrase-${person.id}`}
        >
            <Box component="form" onSubmit={changePersonPhrase}>
                <DialogTitle id={`change-person-phrase-${person.id}`}>Change person phrase</DialogTitle>
                <DialogContent>
                    <Stack spacing={1.5} sx={{ pt: 0.5 }}>
                        <Typography variant="body2" color="text.secondary">
                            Enter the current phrase for {verifiedName}. The stored lookup hash
                            changes only if the current name and phrase match.
                        </Typography>
                        <Alert severity="warning">
                            The new phrase cannot be recovered. It is shown while you type to prevent a hidden
                            mistype, and exact spaces count.
                        </Alert>
                        <TextField
                            label="Current phrase"
                            type="password"
                            value={currentPhraseDraft}
                            onChange={(event) => {
                                setCurrentPhraseDraft(event.target.value)
                                setError('')
                            }}
                            autoComplete="off"
                            helperText="Leave blank only if no phrase was used."
                            autoFocus
                            fullWidth
                            slotProps={{
                                htmlInput: {
                                    'data-1p-ignore': '',
                                    'data-op-ignore': '',
                                },
                            }}
                        />
                        <TextField
                            label="New phrase"
                            type="text"
                            value={newPhraseDraft}
                            onChange={(event) => {
                                setNewPhraseDraft(event.target.value)
                                setError('')
                            }}
                            autoComplete="off"
                            disabled={useBlankPhrase}
                            fullWidth
                            slotProps={{
                                htmlInput: {
                                    'data-1p-ignore': '',
                                    'data-op-ignore': '',
                                },
                            }}
                        />
                        <TextField
                            label="Confirm new phrase"
                            type="text"
                            value={confirmPhraseDraft}
                            onChange={(event) => {
                                setConfirmPhraseDraft(event.target.value)
                                setError('')
                            }}
                            autoComplete="off"
                            disabled={useBlankPhrase}
                            fullWidth
                            slotProps={{
                                htmlInput: {
                                    'data-1p-ignore': '',
                                    'data-op-ignore': '',
                                },
                            }}
                        />
                        <FormControlLabel
                            control={(
                                <Checkbox
                                    checked={useBlankPhrase}
                                    onChange={(event) => {
                                        setUseBlankPhrase(event.target.checked)
                                        setError('')
                                    }}
                                />
                            )}
                            label="Intentionally use no phrase"
                        />
                        {error && (
                            <Typography role="alert" variant="body2" color="error">
                                {error}
                            </Typography>
                        )}
                    </Stack>
                </DialogContent>
                <DialogActions sx={{ px: 3, pb: 2.5 }}>
                    <Button onClick={onClose} disabled={isChanging}>
                        Cancel
                    </Button>
                    <Button
                        type="submit"
                        variant="contained"
                        disabled={isChanging || (!useBlankPhrase && (!newPhraseDraft || !confirmPhraseDraft))}
                    >
                        {isChanging ? <CircularProgress size={20} /> : 'Change phrase'}
                    </Button>
                </DialogActions>
            </Box>
        </Dialog>
    )
}
