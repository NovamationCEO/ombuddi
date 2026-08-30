import { ArrowForward, ShieldOutlined } from '@mui/icons-material'
import { Box, ButtonBase, Stack, Typography } from '@mui/material'
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { institutionalPalette as palette } from '../theme/institutionalPalette'
import { useCurrentOmbuds } from '../tools/useCurrentOmbuds'
import { useOrganization } from '../tools/useOrganization'
import {
    getVisibleAdminDestinations,
    primaryDestinations,
    secondaryDestinations,
    type Destination,
} from './homeDestinations'
import { getTimeOfDayGreeting } from './homeGreeting'

function DestinationCard({ name, url, image, description, action }: Destination) {
    const navigate = useNavigate()

    return (
        <ButtonBase
            onClick={() => navigate(url)}
            sx={{
                width: '100%',
                height: '100%',
                minWidth: 0,
                p: 1.5,
                display: 'grid',
                gridTemplateColumns: { xs: '76px minmax(0, 1fr)', sm: '88px minmax(0, 1fr)' },
                alignItems: 'center',
                gap: 2,
                textAlign: 'left',
                color: palette.text,
                bgcolor: palette.surface,
                border: `1px solid ${palette.border}`,
                borderRadius: 3,
                transition: 'transform 160ms ease, background-color 160ms ease, border-color 160ms ease',
                '&:hover': {
                    transform: 'translateY(-2px)',
                    bgcolor: palette.surfaceRaised,
                    borderColor: palette.borderStrong,
                },
            }}
        >
            <Box
                component="img"
                src={image}
                alt=""
                sx={{
                    width: { xs: 76, sm: 88 },
                    height: { xs: 76, sm: 88 },
                    display: 'block',
                    objectFit: 'cover',
                    borderRadius: 2.25,
                    boxShadow: '0 8px 20px var(--mui-palette-app-shadow)',
                }}
            />
            <Box sx={{ minWidth: 0 }}>
                <Typography
                    variant="h6"
                    sx={{ color: palette.text, fontWeight: 600, mb: 0.5 }}
                >
                    {name}
                </Typography>
                <Typography sx={{ color: palette.muted, fontSize: '0.9rem', mb: 1.25 }}>{description}</Typography>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, color: palette.purpleLight }}>
                    <Typography sx={{ fontSize: '0.82rem', fontWeight: 600 }}>{action}</Typography>
                    <ArrowForward sx={{ fontSize: 17 }} />
                </Box>
            </Box>
        </ButtonBase>
    )
}

function DestinationSection({
    title,
    items,
    separated = false,
}: {
    title: string
    items: Destination[]
    separated?: boolean
}) {
    if (items.length === 0) return null

    return (
        <Box sx={{ mt: separated ? 4 : 0 }}>
            <Typography
                component="h2"
                sx={{
                    color: palette.muted,
                    fontSize: '0.76rem',
                    fontWeight: 600,
                    letterSpacing: '0.12em',
                    textTransform: 'uppercase',
                    mb: 1.5,
                }}
            >
                {title}
            </Typography>

            <Box
                sx={{
                    display: 'grid',
                    gridTemplateColumns: {
                        xs: '1fr',
                        md: 'repeat(2, minmax(0, 1fr))',
                    },
                    gap: 2,
                }}
            >
                {items.map((destination) => (
                    <DestinationCard
                        key={destination.url}
                        {...destination}
                    />
                ))}
            </Box>
        </Box>
    )
}

export function HomePage() {
    const currentOmbuds = useCurrentOmbuds()
    const organization = useOrganization()
    const firstName = currentOmbuds.data?.name?.trim().split(/\s+/)[0]
    const [greeting, setGreeting] = useState(() => getTimeOfDayGreeting())
    const visibleAdminDestinations = getVisibleAdminDestinations(currentOmbuds.data)

    useEffect(() => {
        const timer = window.setInterval(() => setGreeting(getTimeOfDayGreeting()), 60_000)
        return () => window.clearInterval(timer)
    }, [])

    return (
        <Box
            sx={{
                minHeight: '100%',
                p: { xs: 3, sm: 4, lg: 5 },
                boxSizing: 'border-box',
                color: palette.text,
                background: `linear-gradient(122deg, ${palette.background} 0%, ${palette.background} 71%, ${palette.backgroundDeep} 71%)`,
            }}
        >
            <Box sx={{ maxWidth: 1360, mx: 'auto' }}>
                <Box
                    sx={{
                        mb: { xs: 4, md: 5 },
                    }}
                >
                    <Box>
                        <Typography
                            component="p"
                            sx={{
                                color: palette.blueGreen,
                                fontSize: '0.76rem',
                                fontWeight: 700,
                                letterSpacing: '0.14em',
                                textTransform: 'uppercase',
                                mb: 1.25,
                            }}
                        >
                            {organization.name || 'Your organization'}
                        </Typography>
                        <Typography
                            component="h1"
                            sx={{
                                color: palette.text,
                                fontSize: { xs: '2.35rem', sm: '3rem', lg: '3.45rem' },
                                fontWeight: 650,
                                letterSpacing: '-0.045em',
                                lineHeight: 1.03,
                                mb: 1.5,
                            }}
                        >
                            {greeting}
                            {firstName ? `, ${firstName}` : ''}.
                        </Typography>
                        <Typography sx={{ maxWidth: 600, color: palette.muted, fontSize: '1.02rem' }}>
                            Everything you need to continue your confidential case work.
                        </Typography>
                    </Box>
                </Box>

                <DestinationSection
                    title="Your workspace"
                    items={primaryDestinations}
                />
                <DestinationSection
                    title="Account & settings"
                    items={secondaryDestinations}
                    separated
                />
                <DestinationSection
                    title="Administration"
                    items={visibleAdminDestinations}
                    separated
                />

                <Stack
                    direction="row"
                    spacing={1.5}
                    sx={{
                        mt: 3,
                        p: 2,
                        alignItems: 'center',
                        color: palette.muted,
                        bgcolor: palette.surface,
                        border: `1px solid ${palette.border}`,
                        borderLeft: `3px solid ${palette.purple}`,
                        borderRadius: 2,
                    }}
                >
                    <ShieldOutlined sx={{ color: palette.blueGreen }} />
                    <Typography sx={{ fontSize: '0.9rem' }}>
                        Your case notes remain encrypted before they leave this browser.
                    </Typography>
                </Stack>
            </Box>
        </Box>
    )
}
