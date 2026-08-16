import { ArrowForward, FolderOpenRounded, ShieldOutlined } from '@mui/icons-material'
import { Box, Button, ButtonBase, Stack, Typography } from '@mui/material'
import { useNavigate } from 'react-router-dom'
import casesImage from '../assets/images/cases.png'
import profileImage from '../assets/images/profile.png'
import reportImage from '../assets/images/report.png'
import { institutionalPalette as palette } from '../theme/institutionalPalette'
import { useCurrentOmbuds } from '../tools/useCurrentOmbuds'

type Destination = {
    name: string
    url: string
    image: string
    description: string
    action: string
}

const destinations: Destination[] = [
    {
        name: 'Cases',
        url: '/cases',
        image: casesImage,
        description: 'View and continue your active case work.',
        action: 'View cases',
    },
    {
        name: 'Reports',
        url: '/report',
        image: reportImage,
        description: 'Generate a protected annual reporting summary.',
        action: 'Create report',
    },
    {
        name: 'Profile',
        url: '/profile',
        image: profileImage,
        description: 'Manage your practitioner information.',
        action: 'Open profile',
    },
]

function DestinationCard({ name, url, image, description, action }: Destination) {
    const navigate = useNavigate()

    return (
        <ButtonBase
            onClick={() => navigate(url)}
            sx={{
                width: '100%',
                height: '100%',
                minWidth: 0,
                p: { xs: 2, lg: 2.25 },
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
                    boxShadow: '0 8px 20px rgba(3, 18, 21, 0.22)',
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

export function HomePage() {
    const navigate = useNavigate()
    const currentOmbuds = useCurrentOmbuds()
    const firstName = currentOmbuds.data?.name?.trim().split(/\s+/)[0]

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
                        display: 'flex',
                        flexDirection: { xs: 'column', md: 'row' },
                        alignItems: { md: 'flex-start' },
                        justifyContent: 'space-between',
                        gap: 3,
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
                            Your practice
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
                            Good morning{firstName ? `, ${firstName}` : ''}.
                        </Typography>
                        <Typography sx={{ maxWidth: 600, color: palette.muted, fontSize: '1.02rem' }}>
                            Everything you need to continue your confidential case work.
                        </Typography>
                    </Box>

                    <Button
                        variant="contained"
                        startIcon={<FolderOpenRounded />}
                        onClick={() => navigate('/cases')}
                        sx={{
                            flexShrink: 0,
                            alignSelf: { xs: 'stretch', md: 'flex-start' },
                            bgcolor: palette.purple,
                            color: '#fff',
                            px: 2.5,
                            py: 1.15,
                            '&:hover': { bgcolor: palette.purpleDark },
                        }}
                    >
                        Open cases
                    </Button>
                </Box>

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
                    Your workspace
                </Typography>

                <Box
                    sx={{
                        display: 'grid',
                        gridTemplateColumns: { xs: '1fr', lg: 'repeat(3, minmax(0, 1fr))' },
                        gap: 2,
                    }}
                >
                    {destinations.map((destination) => (
                        <DestinationCard
                            key={destination.url}
                            {...destination}
                        />
                    ))}
                </Box>

                <Stack
                    direction="row"
                    spacing={1.5}
                    sx={{
                        mt: 3,
                        p: 2,
                        alignItems: 'center',
                        color: palette.muted,
                        bgcolor: 'rgba(11, 29, 32, 0.48)',
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
