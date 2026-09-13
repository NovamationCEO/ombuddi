import {
    Box,
    Button,
    CircularProgress,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    Stack,
    TextField,
    Typography,
} from '@mui/material'
import React from 'react'
import { useSessionSalt } from '../libraries/useSessionSalt'
import { useVerifiedPersonNames } from '../libraries/useVerifiedPersonNames'
import { getter } from '../tools/db_tools/getter'
import type { PersonType } from '../types/majorTypes'
import { hashPersonName } from '../tools/useHashName'

export function PersonVerificationDialog({
    person,
    onClose,
}: {
    person: PersonType
    onClose: () => void
}) {
    const sessionSalt = useSessionSalt((state) => state.sessionSalt)
    const setVerifiedName = useVerifiedPersonNames((state) => state.setVerifiedName)
    const [nameDraft, setNameDraft] = React.useState('')
    const [phraseDraft, setPhraseDraft] = React.useState(sessionSalt || '')
    const [error, setError] = React.useState('')
    const [isVerifying, setIsVerifying] = React.useState(false)

    async function verifyPerson(event: React.FormEvent) {
        event.preventDefault()
        const candidateName = nameDraft.trim()
        if (!candidateName) {
            setError('Enter the name you want to verify.')
            return
        }

        setIsVerifying(true)
        setError('')
        try {
            const hash = hashPersonName(candidateName, phraseDraft, person.organizationId)
            const matches = await getter<PersonType[]>(`get_persons_by_hashed_name/${hash}`)
            if (!matches.some((match) => match.id === person.id)) {
                setError('That name and phrase do not match this person.')
                return
            }
            setVerifiedName(person.id, candidateName)
            onClose()
        } catch (caught) {
            setError(caught instanceof Error ? caught.message : 'The name could not be verified. Please try again.')
        } finally {
            setIsVerifying(false)
        }
    }

    return (
        <Dialog
            open
            onClose={() => {
                if (!isVerifying) onClose()
            }}
            fullWidth
            maxWidth="xs"
            aria-labelledby={`verify-person-${person.id}`}
        >
            <Box component="form" onSubmit={verifyPerson}>
                <DialogTitle id={`verify-person-${person.id}`}>Verify person</DialogTitle>
                <DialogContent>
                    <Stack spacing={1.5} sx={{ pt: 0.5 }}>
                        <Typography variant="body2" color="text.secondary">
                            Enter the name and phrase used when this person was added. A match
                            reveals the name only for this browser session.
                        </Typography>
                        <TextField
                            label="Name"
                            value={nameDraft}
                            onChange={(event) => {
                                setNameDraft(event.target.value)
                                setError('')
                            }}
                            autoComplete="off"
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
                            label="Phrase"
                            type="password"
                            value={phraseDraft}
                            onChange={(event) => {
                                setPhraseDraft(event.target.value)
                                setError('')
                            }}
                            autoComplete="off"
                            helperText="Leave blank only if no phrase was used."
                            fullWidth
                            slotProps={{
                                htmlInput: {
                                    'data-1p-ignore': '',
                                    'data-op-ignore': '',
                                },
                            }}
                        />
                        {error && (
                            <Typography role="alert" variant="body2" color="error">
                                {error}
                            </Typography>
                        )}
                    </Stack>
                </DialogContent>
                <DialogActions sx={{ px: 3, pb: 2.5 }}>
                    <Button onClick={onClose} disabled={isVerifying}>
                        Cancel
                    </Button>
                    <Button type="submit" variant="contained" disabled={isVerifying || !nameDraft.trim()}>
                        {isVerifying ? <CircularProgress size={20} /> : 'Verify'}
                    </Button>
                </DialogActions>
            </Box>
        </Dialog>
    )
}
