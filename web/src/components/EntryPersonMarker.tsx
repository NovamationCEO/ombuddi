import { Box, Stack, Tooltip, Typography } from '@mui/material'
import type { PersonType } from '../types/majorTypes'
import { PersonAvatar } from './PersonAvatar'
import { personDisplayDetails, personDisplayLabel } from './personDisplay'

function PersonDetails({ person }: { person: PersonType }) {
    const label = personDisplayLabel(person)
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
        </Box>
    )
}

export function EntryPersonMarker({ person }: { person: PersonType }) {
    const label = personDisplayLabel(person)

    return (
        <Tooltip
            title={<PersonDetails person={person} />}
            placement="top-start"
            arrow
            enterDelay={250}
            describeChild
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
                aria-label={`${label}. Hover or focus for person details.`}
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
                    cursor: 'help',
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
    )
}
