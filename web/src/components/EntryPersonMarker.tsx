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
    Tooltip,
    Typography,
} from '@mui/material'
import React from 'react'
import type { PersonType } from '../types/majorTypes'
import { getter } from '../tools/db_tools/getter'
import { hashPersonName } from '../tools/useHashName'
import { useSessionSalt } from '../libraries/useSessionSalt'
import { useVerifiedPersonNames } from '../libraries/useVerifiedPersonNames'
import { PersonAvatar } from './PersonAvatar'
import { personDisplayDetails, personDisplayLabel } from './personDisplay'

function PersonDetails({ person, displayName }: { person: PersonType; displayName?: string }) {
    const label = displayName || personDisplayLabel(person)
    const details = personDisplayDetails(person)

    return (
        <Box sx={{ minWidth: 190, maxWidth: 280, p: 0.5 }}>
            <Typography sx={{ color: 'text.primary', fontWeight: 700, mb: details.length ? 1 : 0.25 }}>
                {label}
            </Typography>
            {details.length ? (
                <Stack spacing={0.55}>
                    {details.map((detail) => (
                        <Box
                            key={detail.label}
                            sx={{ display: 'grid', gridTemplateColumns: '88px minmax(0, 1fr)', gap: 1 }}
                        >
                            <Typography
                                variant="caption"
                                sx={{ color: 'text.secondary', fontWeight: 650 }}
                            >
                                {detail.label}
                            </Typography>
                            <Typography
                                variant="caption"
                                sx={{ color: 'text.primary', overflowWrap: 'anywhere' }}
                            >
                                {detail.value}
                            </Typography>
                        </Box>
                    ))}
                </Stack>
            ) : (
                <Typography
                    variant="caption"
                    sx={{ color: 'text.secondary' }}
                >
                    No additional details recorded.
                </Typography>
            )}
            {!person.isPublic && (
                <Typography
                    variant="caption"
                    sx={{ display: 'block', color: 'text.secondary', mt: 1 }}
                >
                    Double-click the avatar to verify its name.
                </Typography>
            )}
        </Box>
    )
}

export function EntryPersonMarker({ person }: { person: PersonType }) {
    const sessionSalt = useSessionSalt((state) => state.sessionSalt)
    const verifiedName = useVerifiedPersonNames((state) => state.names[person.id])
    const setVerifiedName = useVerifiedPersonNames((state) => state.setVerifiedName)
    const [verifyOpen, setVerifyOpen] = React.useState(false)
    const [nameDraft, setNameDraft] = React.useState('')
    const [phraseDraft, setPhraseDraft] = React.useState('')
    const [error, setError] = React.useState('')
    const [isVerifying, setIsVerifying] = React.useState(false)

    const publicName = person.isPublic ? personDisplayLabel(person) : undefined
    const displayName = publicName === 'Person details' ? undefined : publicName || verifiedName
    const label = displayName || personDisplayLabel(person)

    function openVerification() {
        if (person.isPublic) return
        setNameDraft(verifiedName || '')
        setPhraseDraft(sessionSalt || '')
        setError('')
        setVerifyOpen(true)
    }

    function closeVerification() {
        if (isVerifying) return
        setVerifyOpen(false)
        setNameDraft('')
        setPhraseDraft('')
        setError('')
    }

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
            const hash = hashPersonName(nameDraft, phraseDraft, person.organizationId)
            const matches = await getter<PersonType[]>(`get_persons_by_hashed_name/${hash}`)
            if (!matches.some((match) => match.id === person.id)) {
                setError('That name and phrase do not match this person.')
                return
            }
            setVerifiedName(person.id, candidateName)
            setVerifyOpen(false)
            setNameDraft('')
            setPhraseDraft('')
        } catch {
            setError('The name could not be verified. Please try again.')
        } finally {
            setIsVerifying(false)
        }
    }

    return (
        <>
            <Box
                sx={{
                    display: 'inline-flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    alignSelf: 'flex-start',
                    color: 'inherit',
                }}
            >
                <Tooltip
                    title={<PersonDetails person={person} displayName={displayName} />}
                    placement="top-start"
                    arrow
                    enterDelay={250}
                    describeChild
                    disableHoverListener={verifyOpen}
                    slotProps={{
                        tooltip: {
                            sx: {
                                bgcolor: 'background.paper',
                                border: '1px solid',
                                borderColor: 'divider',
                                boxShadow: 5,
                                p: 1,
                            },
                        },
                        arrow: { sx: { color: 'background.paper' } },
                    }}
                >
                    <Box
                        component="span"
                        tabIndex={0}
                        aria-label={`${label}. Hover or focus for person details.${
                            person.isPublic ? '' : ' Double-click or press Enter to verify the name.'
                        }`}
                        onDoubleClick={(event) => {
                            event.stopPropagation()
                            openVerification()
                        }}
                        onKeyDown={(event) => {
                            if (!person.isPublic && event.key === 'Enter') {
                                event.preventDefault()
                                openVerification()
                            }
                        }}
                        sx={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            width: 52,
                            height: 52,
                            p: '2px',
                            bgcolor: 'app.surfaceTint',
                            border: '1px solid',
                            borderColor: 'transparent',
                            borderRadius: 999,
                            cursor: person.isPublic ? 'help' : 'pointer',
                            outline: 'none',
                            transition: 'border-color 120ms ease, background-color 120ms ease',
                            '&:hover, &:focus-visible': {
                                borderColor: 'secondary.main',
                                bgcolor: 'action.hover',
                            },
                        }}
                    >
                        <PersonAvatar
                            seed={person.monsterSeed || person.id}
                            version={person.monsterVersion}
                            size={46}
                        />
                    </Box>
                </Tooltip>
                {displayName && (
                    <Typography
                        variant="caption"
                        sx={{
                            maxWidth: 104,
                            mt: 0.3,
                            color: 'inherit',
                            fontSize: '0.64rem',
                            lineHeight: 1.1,
                            textAlign: 'center',
                            overflowWrap: 'anywhere',
                        }}
                    >
                        {displayName}
                    </Typography>
                )}
            </Box>

            <Dialog
                open={verifyOpen}
                onClose={closeVerification}
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
                        <Button onClick={closeVerification} disabled={isVerifying}>
                            Cancel
                        </Button>
                        <Button type="submit" variant="contained" disabled={isVerifying || !nameDraft.trim()}>
                            {isVerifying ? <CircularProgress size={20} /> : 'Verify'}
                        </Button>
                    </DialogActions>
                </Box>
            </Dialog>
        </>
    )
}
