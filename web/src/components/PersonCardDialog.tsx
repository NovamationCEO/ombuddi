import { Alert, Box, Button, Dialog, DialogContent, DialogTitle, Stack, TextField, Typography } from '@mui/material'
import { ThemeProvider } from '@mui/material/styles'
import React from 'react'
import type { PersonType } from '../types/majorTypes'
import type { PersonCredentials } from '../tools/personLookup'
import { hashPersonName } from '../tools/useHashName'
import { getter } from '../tools/db_tools/getter'
import { useVerifiedPersonNames } from '../libraries/useVerifiedPersonNames'
import { caseFolderTheme } from '../theme/caseFolderTheme'
import { PersonPhraseField } from './PersonPhraseField'
import { PersonAvatar } from './PersonAvatar'
import { personDisplayDetails } from './personDisplay'
import { PersonForm } from './AddPerson/PersonForm'
import './PersonIndexCard.css'

export function PersonCardDialog({
    person,
    onClose,
    onSaved,
    initialName = '',
    embedded = false,
    onBusyChange,
}: {
    person: PersonType
    onClose: () => void
    onSaved?: (person: PersonType) => void
    initialName?: string
    embedded?: boolean
    onBusyChange?: (busy: boolean) => void
}) {
    const knownName = useVerifiedPersonNames((state) => state.names[person.id])
    const [name, setName] = React.useState(person.publicName || knownName || initialName)
    const [phrase, setPhrase] = React.useState('')
    const [credentials, setCredentials] = React.useState<PersonCredentials | null>(
        person.isPublic ? { name: person.publicName || '', phrase: '' } : null,
    )
    const [current, setCurrent] = React.useState(person)
    const [editing, setEditing] = React.useState(false)
    const [busy, setBusy] = React.useState(false)
    const [error, setError] = React.useState('')
    React.useEffect(() => {
        onBusyChange?.(busy)
        return () => onBusyChange?.(false)
    }, [busy, onBusyChange])
    async function verify(event: React.FormEvent) {
        event.preventDefault()
        if (!name.trim() || busy) return
        setBusy(true)
        setError('')
        try {
            const matches = await getter<PersonType[]>(
                `get_persons_by_hashed_name/${hashPersonName(name, phrase, person.organizationId)}`,
            )
            const match = matches.find((item) => item.id === person.id)
            if (!match) {
                setError('That full name and phrase do not match this person.')
                return
            }
            setCurrent(match)
            setCredentials({ name: name.trim(), phrase })
            useVerifiedPersonNames.getState().setVerifiedName(person.id, name.trim())
        } catch {
            setError('Unable to verify this person. Please try again.')
        } finally {
            setBusy(false)
        }
    }
    const content = (
        <>
            {!credentials ? (
                <Box
                    component="form"
                    onSubmit={verify}
                    className="person-index-card person-card-form"
                >
                    <Stack spacing={2.5}>
                        <PersonAvatar
                            person={person}
                            size={62}
                        />
                        <Typography
                            variant="body2"
                            color="text.secondary"
                        >
                            Enter the full name and phrase used for this person to view or edit their details.
                        </Typography>
                        <TextField
                            label="Full Name"
                            variant="standard"
                            autoFocus
                            value={name}
                            onChange={(event) => setName(event.target.value)}
                            disabled={busy}
                            autoComplete="off"
                        />
                        <PersonPhraseField
                            value={phrase}
                            onChange={setPhrase}
                            disabled={busy}
                        />
                        {error && <Alert severity="error">{error}</Alert>}
                        <Stack
                            direction="row"
                            spacing={1}
                            sx={{ justifyContent: 'flex-end' }}
                        >
                            <Button
                                type="button"
                                disabled={busy}
                                onClick={onClose}
                            >
                                Cancel
                            </Button>
                            <Button
                                type="submit"
                                variant="contained"
                                disabled={busy || !name.trim()}
                            >
                                {busy ? 'Verifying…' : 'Open card'}
                            </Button>
                        </Stack>
                    </Stack>
                </Box>
            ) : editing ? (
                <PersonForm
                    person={current}
                    onBusyChange={setBusy}
                    credentials={credentials}
                    onCancel={() => setEditing(false)}
                    onSaved={(saved, nextCredentials) => {
                        setCurrent(saved)
                        setCredentials(nextCredentials)
                        setEditing(false)
                        onSaved?.(saved)
                    }}
                />
            ) : (
                <Box className="person-index-card person-card-form">
                    <Stack spacing={2}>
                        <Stack
                            direction="row"
                            spacing={2}
                            sx={{ alignItems: 'center' }}
                        >
                            <PersonAvatar
                                person={current}
                                size={62}
                            />
                            <Box>
                                <Typography
                                    component="h2"
                                    sx={{
                                        fontFamily: 'Georgia, serif',
                                        fontSize: '1.5rem',
                                        overflowWrap: 'anywhere',
                                    }}
                                >
                                    {credentials.name}
                                </Typography>
                                <Typography
                                    variant="caption"
                                    color="text.secondary"
                                >
                                    {current.isPublic ? 'Public person' : 'Name and phrase verified'}
                                </Typography>
                            </Box>
                        </Stack>
                        <Box
                            component="dl"
                            sx={{ m: 0 }}
                        >
                            {personDisplayDetails(current).map((detail) => (
                                <Box
                                    key={detail.label}
                                    sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', py: 1, gap: 2 }}
                                >
                                    <Typography
                                        component="dt"
                                        variant="body2"
                                        color="text.secondary"
                                    >
                                        {detail.label}
                                    </Typography>
                                    <Typography
                                        component="dd"
                                        variant="body2"
                                        sx={{ m: 0, overflowWrap: 'anywhere' }}
                                    >
                                        {detail.value}
                                    </Typography>
                                </Box>
                            ))}
                        </Box>
                        <Stack
                            direction="row"
                            spacing={1}
                            sx={{ justifyContent: 'flex-end' }}
                        >
                            <Button onClick={onClose}>Close</Button>
                            <Button
                                variant="contained"
                                onClick={() => setEditing(true)}
                            >
                                Edit person
                            </Button>
                        </Stack>
                    </Stack>
                </Box>
            )}
        </>
    )
    if (embedded) return content
    return (
        <ThemeProvider theme={caseFolderTheme}>
            <Dialog
                open
                onClose={busy ? undefined : onClose}
                fullWidth
                maxWidth={credentials ? 'sm' : 'xs'}
                aria-labelledby="person-card-dialog-title"
                slotProps={{ paper: { sx: { bgcolor: '#e9d1a0', p: { xs: 1, sm: 2 } } } }}
            >
                <DialogTitle
                    id="person-card-dialog-title"
                    sx={{ fontFamily: 'Georgia, serif' }}
                >
                    {credentials ? 'Person card' : 'Verify person'}
                </DialogTitle>
                <DialogContent sx={{ p: { xs: 1, sm: 2 } }}>{content}</DialogContent>
            </Dialog>
        </ThemeProvider>
    )
}
