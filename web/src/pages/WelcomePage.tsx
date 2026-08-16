import type { ReactNode } from 'react'
import { useAuth0 } from '@auth0/auth0-react'
import {
    AdminPanelSettings,
    ArrowForward,
    Email,
    Lock,
    Login,
    ShieldOutlined,
    VisibilityOff,
} from '@mui/icons-material'
import { Box, Button, Divider, Stack, Typography } from '@mui/material'
import Grid2 from '@mui/material/Grid'
import mascot from '../assets/images/mascot.png'
import { institutionalPalette as palette } from '../theme/institutionalPalette'

type PrivacyCardProps = {
    icon: ReactNode
    number: string
    title: string
    children: ReactNode
}

function PrivacyCard({ icon, number, title, children }: PrivacyCardProps) {
    return (
        <Box
            sx={{
                height: '100%',
                p: { xs: 2.5, md: 3 },
                bgcolor: palette.surface,
                border: `1px solid ${palette.border}`,
                borderRadius: 1.5,
            }}
        >
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2.5 }}>
                <Box
                    sx={{
                        width: 46,
                        height: 46,
                        display: 'grid',
                        placeItems: 'center',
                        borderRadius: '50%',
                        bgcolor: 'rgba(154, 108, 174, 0.16)',
                        color: palette.purpleLight,
                    }}
                >
                    {icon}
                </Box>
                <Typography sx={{ color: palette.blueGreen, letterSpacing: '0.14em' }}>{number}</Typography>
            </Box>
            <Typography
                variant="h6"
                sx={{ color: palette.text, fontWeight: 600, mb: 1 }}
            >
                {title}
            </Typography>
            <Typography sx={{ color: palette.muted }}>{children}</Typography>
        </Box>
    )
}

function Eyebrow({ children }: { children: ReactNode }) {
    return (
        <Typography
            component="p"
            sx={{
                color: palette.blueGreen,
                fontSize: '0.78rem',
                fontWeight: 700,
                letterSpacing: '0.14em',
                textTransform: 'uppercase',
                mb: 1.5,
            }}
        >
            {children}
        </Typography>
    )
}

export function WelcomePage() {
    const { loginWithRedirect } = useAuth0()

    return (
        <Box
            sx={{
                width: '100%',
                minHeight: '100%',
                overflow: 'hidden',
                bgcolor: palette.background,
                color: palette.text,
            }}
        >
            <Grid2
                container
                sx={{
                    minHeight: { md: 570 },
                    background: `linear-gradient(118deg, ${palette.background} 0%, ${palette.background} 61%, ${palette.backgroundDeep} 61%)`,
                }}
            >
                <Grid2 size={{ xs: 12, md: 7 }}>
                    <Box sx={{ p: { xs: 3, sm: 5, md: 7 }, height: '100%' }}>
                        <Box
                            sx={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: 1,
                                mb: 3,
                                color: palette.blueGreen,
                            }}
                        >
                            <ShieldOutlined fontSize="small" />
                            <Typography sx={{ fontSize: '0.78rem', fontWeight: 700, letterSpacing: '0.14em' }}>
                                SECURE PRACTICE INFRASTRUCTURE
                            </Typography>
                        </Box>

                        <Typography
                            component="h1"
                            sx={{
                                maxWidth: 720,
                                color: palette.text,
                                fontSize: { xs: '2.35rem', sm: '3.15rem', md: '3.7rem' },
                                fontWeight: 650,
                                letterSpacing: '-0.045em',
                                lineHeight: 1.04,
                                mb: 3,
                            }}
                        >
                            Case management that upholds the Ombuds mandate.
                        </Typography>

                        <Typography sx={{ maxWidth: 650, color: palette.muted, fontSize: '1.08rem', mb: 3.5 }}>
                            Ombuddi is case-logging and reporting software built specifically for Ombuds
                            practitioners—private by design, practitioner controlled, and aligned with the realities of
                            confidential practice.
                        </Typography>

                        <Stack
                            direction={{ xs: 'column', sm: 'row' }}
                            spacing={1.5}
                            sx={{ alignItems: { sm: 'center' } }}
                        >
                            <Button
                                variant="contained"
                                startIcon={<Login />}
                                onClick={() => void loginWithRedirect()}
                                sx={{
                                    alignSelf: { xs: 'stretch', sm: 'auto' },
                                    bgcolor: palette.purple,
                                    color: '#fff',
                                    px: 2.5,
                                    py: 1.15,
                                    '&:hover': { bgcolor: palette.purpleDark },
                                }}
                            >
                                Log in to Ombuddi
                            </Button>
                            <Button
                                component="a"
                                href="mailto:hello@ombuddi.com"
                                endIcon={<ArrowForward />}
                                sx={{
                                    alignSelf: { xs: 'stretch', sm: 'auto' },
                                    color: palette.purpleLight,
                                    px: 2,
                                    py: 1.15,
                                }}
                            >
                                Discuss your organization
                            </Button>
                        </Stack>

                        <Stack
                            direction="row"
                            sx={{ mt: 4, flexWrap: 'wrap', gap: 1 }}
                        >
                            {['Private by design', 'Built for Ombuds', 'Practitioner controlled'].map((label) => (
                                <Box
                                    key={label}
                                    sx={{
                                        px: 1.5,
                                        py: 0.6,
                                        color: palette.blueGreen,
                                        border: `1px solid ${palette.borderStrong}`,
                                        borderRadius: 10,
                                        fontSize: '0.82rem',
                                    }}
                                >
                                    {label}
                                </Box>
                            ))}
                        </Stack>
                    </Box>
                </Grid2>

                <Grid2 size={{ xs: 12, md: 5 }}>
                    <Box
                        sx={{
                            height: '100%',
                            p: { xs: 3, sm: 5, md: 6 },
                            display: 'flex',
                            alignItems: 'center',
                        }}
                    >
                        <Box
                            sx={{
                                width: '100%',
                                p: { xs: 2.5, md: 3.5 },
                                bgcolor: palette.surfaceRaised,
                                border: `1px solid ${palette.borderStrong}`,
                                borderRadius: 2,
                                boxShadow: '0 18px 40px rgba(0, 0, 0, 0.18)',
                            }}
                        >
                            <Box
                                sx={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'space-between',
                                    gap: 2,
                                }}
                            >
                                <Box
                                    sx={{
                                        width: 48,
                                        height: 48,
                                        flexShrink: 0,
                                        display: 'grid',
                                        placeItems: 'center',
                                        borderRadius: '50%',
                                        bgcolor: 'rgba(140, 181, 178, 0.13)',
                                        color: palette.blueGreen,
                                    }}
                                >
                                    <ShieldOutlined />
                                </Box>
                                <Box
                                    component="img"
                                    src={mascot}
                                    alt="Ombuddi mascot waving"
                                    sx={{
                                        display: 'block',
                                        width: { xs: 128, sm: 160, md: 176 },
                                        maxWidth: '54%',
                                        height: 'auto',
                                        flexShrink: 1,
                                        filter: 'drop-shadow(0 14px 18px rgba(0, 0, 0, 0.22))',
                                    }}
                                />
                            </Box>

                            <Typography
                                variant="h5"
                                sx={{ color: palette.text, fontWeight: 650, mt: 2.5, mb: 1 }}
                            >
                                Privacy is the architecture.
                            </Typography>
                            <Typography sx={{ color: palette.muted, mb: 2.5 }}>
                                Confidentiality is enforced before sensitive visitor data reaches the application.
                            </Typography>

                            <Stack
                                divider={
                                    <Divider
                                        flexItem
                                        sx={{ borderColor: palette.border }}
                                    />
                                }
                            >
                                {[
                                    ['01', 'One-way visitor identity hashing'],
                                    ['02', 'AES-256-GCM note encryption'],
                                    ['03', 'No administrative data backdoor'],
                                ].map(([number, text]) => (
                                    <Box
                                        key={number}
                                        sx={{ display: 'flex', gap: 2, py: 1.5, alignItems: 'center' }}
                                    >
                                        <Typography sx={{ color: palette.purpleLight }}>{number}</Typography>
                                        <Typography sx={{ color: palette.text }}>{text}</Typography>
                                    </Box>
                                ))}
                            </Stack>
                        </Box>
                    </Box>
                </Grid2>
            </Grid2>

            <Box sx={{ p: { xs: 3, sm: 5, md: 7 }, bgcolor: palette.backgroundDeep }}>
                <Grid2
                    container
                    spacing={{ xs: 4, md: 7 }}
                >
                    <Grid2 size={{ xs: 12, md: 6 }}>
                        <Eyebrow>What is Ombuddi?</Eyebrow>
                        <Typography
                            variant="h4"
                            sx={{ color: palette.text, fontWeight: 650, mb: 2 }}
                        >
                            A safer record of the work.
                        </Typography>
                        <Typography sx={{ color: palette.muted }}>
                            Visitor information is kept private by design: names are never stored in plaintext, and case
                            notes are encrypted before they leave your browser. Only you can read what you&apos;ve
                            recorded.
                        </Typography>
                    </Grid2>
                    <Grid2 size={{ xs: 12, md: 6 }}>
                        <Eyebrow>Why does it exist?</Eyebrow>
                        <Typography
                            variant="h4"
                            sx={{ color: palette.text, fontWeight: 650, mb: 2 }}
                        >
                            Purpose-built for the role.
                        </Typography>
                        <Typography sx={{ color: palette.muted }}>
                            Most Ombuds offices make do with student-conduct systems, spreadsheets, or general
                            case-management tools that were never designed for confidentiality or IOA standards. Ombuddi
                            was created by an Ombuds practitioner to fill that gap—the first application built
                            specifically for the role.
                        </Typography>
                    </Grid2>
                </Grid2>
            </Box>

            <Box sx={{ p: { xs: 3, sm: 5, md: 7 } }}>
                <Box sx={{ maxWidth: 720, mb: 4 }}>
                    <Eyebrow>Privacy by design</Eyebrow>
                    <Typography
                        variant="h3"
                        sx={{ color: palette.text, fontWeight: 650, mb: 2 }}
                    >
                        Confidentiality, enforced technically.
                    </Typography>
                    <Typography sx={{ color: palette.muted }}>
                        The IOA requires that Ombuds maintain strict confidentiality. Ombuddi carries that obligation
                        into the underlying technology.
                    </Typography>
                </Box>

                <Grid2
                    container
                    spacing={2}
                >
                    <Grid2 size={{ xs: 12, md: 4 }}>
                        <PrivacyCard
                            icon={<VisibilityOff />}
                            number="01"
                            title="Identity protection"
                        >
                            Visitor identities are stored as one-way cryptographic hashes—the application cannot reveal
                            who you spoke with.
                        </PrivacyCard>
                    </Grid2>
                    <Grid2 size={{ xs: 12, md: 4 }}>
                        <PrivacyCard
                            icon={<Lock />}
                            number="02"
                            title="Local encryption"
                        >
                            Case notes are encrypted with AES-256-GCM before they leave your browser.
                        </PrivacyCard>
                    </Grid2>
                    <Grid2 size={{ xs: 12, md: 4 }}>
                        <PrivacyCard
                            icon={<AdminPanelSettings />}
                            number="03"
                            title="Practitioner access"
                        >
                            Ombuddi staff cannot access visitor data. There is no support backdoor.
                        </PrivacyCard>
                    </Grid2>
                </Grid2>
            </Box>

            <Box
                sx={{
                    mx: { xs: 3, sm: 5, md: 7 },
                    mb: { xs: 3, sm: 5, md: 7 },
                    p: { xs: 3, md: 4 },
                    display: 'flex',
                    flexDirection: { xs: 'column', md: 'row' },
                    alignItems: { md: 'center' },
                    justifyContent: 'space-between',
                    gap: 3,
                    bgcolor: 'rgba(154, 108, 174, 0.13)',
                    border: '1px solid rgba(196, 167, 208, 0.34)',
                    borderLeft: `4px solid ${palette.purple}`,
                    borderRadius: 1.5,
                }}
            >
                <Box sx={{ maxWidth: 760 }}>
                    <Eyebrow>Get started</Eyebrow>
                    <Typography
                        variant="h5"
                        sx={{ color: palette.text, fontWeight: 650, mb: 1 }}
                    >
                        Ombuddi is currently in private alpha.
                    </Typography>
                    <Typography sx={{ color: palette.muted }}>
                        If your organization is participating, ask your administrator for an invitation link to create
                        your account. Interested in bringing Ombuddi to your organization? Reach out to us.
                    </Typography>
                </Box>
                <Button
                    component="a"
                    href="mailto:hello@ombuddi.com"
                    variant="outlined"
                    startIcon={<Email />}
                    sx={{
                        flexShrink: 0,
                        alignSelf: { xs: 'stretch', md: 'center' },
                        color: palette.purpleLight,
                        borderColor: palette.purpleLight,
                        px: 2.5,
                        py: 1.1,
                        '&:hover': {
                            borderColor: palette.text,
                            bgcolor: 'rgba(196, 167, 208, 0.08)',
                        },
                    }}
                >
                    hello@ombuddi.com
                </Button>
            </Box>
        </Box>
    )
}
