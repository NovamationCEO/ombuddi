import {
    Box,
    Stack,
    Tooltip,
    Typography,
} from '@mui/material'
import React from 'react'
import type { PersonType } from '../types/majorTypes'
import { useVerifiedPersonNames } from '../libraries/useVerifiedPersonNames'
import { PersonAvatar } from './PersonAvatar'
import { personDisplayDetails, personDisplayLabel, personPublicName } from './personDisplay'
import { PersonPhraseChangeDialog } from './PersonPhraseChangeDialog'
import { PersonVerificationDialog } from './PersonVerificationDialog'

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
                    {displayName
                        ? 'Name verified for this browser session. Double-click the avatar to change its phrase.'
                        : 'Double-click the avatar to verify its name.'}
                </Typography>
            )}
        </Box>
    )
}

export function EntryPersonMarker({ person }: { person: PersonType }) {
    const verifiedName = useVerifiedPersonNames((state) => state.names[person.id])
    const [verifyOpen, setVerifyOpen] = React.useState(false)
    const [phraseChangeOpen, setPhraseChangeOpen] = React.useState(false)

    const displayName = personPublicName(person) || verifiedName
    const label = displayName || personDisplayLabel(person)

    function openVerification() {
        if (person.isPublic) return
        if (verifiedName) {
            setPhraseChangeOpen(true)
            return
        }
        setVerifyOpen(true)
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
                    disableHoverListener={verifyOpen || phraseChangeOpen}
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
                            person.isPublic
                                ? ''
                                : verifiedName
                                  ? ' Double-click or press Enter to change the phrase.'
                                  : ' Double-click or press Enter to verify the name.'
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
                            person={person}
                            size={46}
                        />
                    </Box>
                </Tooltip>
                {displayName && (
                    <Box
                        sx={{
                            mt: 0.3,
                            color: 'inherit',
                            display: 'flex',
                            alignItems: 'flex-start',
                            justifyContent: 'center',
                            maxWidth: 124,
                        }}
                    >
                        <Typography
                            variant="caption"
                            sx={{
                                color: 'inherit',
                                fontSize: '0.64rem',
                                lineHeight: 1.1,
                                textAlign: 'center',
                                overflowWrap: 'anywhere',
                            }}
                        >
                            {displayName}
                        </Typography>
                    </Box>
                )}
            </Box>

            {verifyOpen && (
                <PersonVerificationDialog
                    person={person}
                    onClose={() => setVerifyOpen(false)}
                />
            )}
            {phraseChangeOpen && verifiedName && (
                <PersonPhraseChangeDialog
                    person={person}
                    verifiedName={verifiedName}
                    onClose={() => setPhraseChangeOpen(false)}
                />
            )}
        </>
    )
}
