import type { ReactNode } from 'react'
import { useAuth0 } from '@auth0/auth0-react'
import {
    AdminPanelSettings,
    ArrowForward,
    AssessmentOutlined,
    Lock,
    Login,
    VisibilityOff,
} from '@mui/icons-material'
import { Box, Button, Link, Stack, Typography } from '@mui/material'
import Grid2 from '@mui/material/Grid'
import mascot from '../assets/images/mascot.webp'
import { institutionalPalette as palette } from '../theme/institutionalPalette'

type PrivacyCardProps = {
    icon: ReactNode
    title: string
    children: ReactNode
}

function PrivacyCard({ icon, title, children }: PrivacyCardProps) {
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
            <Box sx={{ mb: 2.5 }}>
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
            </Box>
            <Typography
                component="h3"
                variant="h6"
                sx={{ color: palette.text, fontWeight: 600, mb: 1 }}
            >
                {title}
            </Typography>
            <Typography sx={{ color: palette.muted }}>{children}</Typography>
        </Box>
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
            <Box
                sx={{
                    display: 'grid',
                    gridTemplateColumns: { xs: '1fr', md: 'minmax(0, 1fr) auto' },
                    alignItems: 'center',
                    gap: { xs: 3, md: 6 },
                    p: { xs: 3, sm: 5, md: 7 },
                    bgcolor: palette.backgroundDeep,
                }}
            >
                <Box
                    component="img"
                    src={mascot}
                    alt="Ombuddi mascot waving"
                    sx={{
                        gridColumn: { md: 2 },
                        gridRow: 1,
                        justifySelf: { xs: 'start', md: 'center' },
                        display: 'block',
                        width: { xs: 112, sm: 144, md: 220 },
                        height: 'auto',
                        filter: 'drop-shadow(0 14px 18px rgba(0, 0, 0, 0.16))',
                    }}
                />
                <Box sx={{ gridColumn: 1, gridRow: { md: 1 } }}>
                    <Typography
                        component="h1"
                        sx={{
                            maxWidth: 720,
                            color: palette.text,
                            fontSize: { xs: '2.35rem', sm: '3.15rem', md: '3.7rem' },
                            fontWeight: 650,
                            letterSpacing: '-0.045em',
                            lineHeight: 1.08,
                            mb: 2,
                        }}
                    >
                        A quieter place for confidential work.
                    </Typography>
                    <Typography sx={{ maxWidth: 600, color: palette.muted, fontSize: '1.08rem', mb: 3 }}>
                        Case logging and reporting for Ombuds, created by an Ombuds practitioner.
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
                            Ask about Ombuddi
                        </Button>
                    </Stack>
                </Box>
            </Box>

            <Box sx={{ p: { xs: 3, sm: 5, md: 7 }, bgcolor: palette.surfaceRaised }}>
                <Box sx={{ maxWidth: 720, mb: 4 }}>
                    <Typography
                        component="h2"
                        variant="h3"
                        sx={{ color: palette.text, fontSize: { xs: '1.85rem', sm: '2.4rem', md: '2.75rem' }, fontWeight: 650, mb: 2 }}
                    >
                        Privacy by design
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
                            title="Identity protection"
                        >
                            Visitor identities are stored as one-way cryptographic hashes—the application cannot reveal
                            who you spoke with.
                        </PrivacyCard>
                    </Grid2>
                    <Grid2 size={{ xs: 12, md: 4 }}>
                        <PrivacyCard
                            icon={<Lock />}
                            title="Local encryption"
                        >
                            Protect case notes with AES-256-GCM encryption before they leave your browser.
                        </PrivacyCard>
                    </Grid2>
                    <Grid2 size={{ xs: 12, md: 4 }}>
                        <PrivacyCard
                            icon={<AdminPanelSettings />}
                            title="Practitioner access"
                        >
                            Ombuddi staff cannot unlock phrase-encrypted notes. There is no support backdoor to your
                            encryption phrase.
                        </PrivacyCard>
                    </Grid2>
                </Grid2>
            </Box>

            <Box
                component="section"
                aria-labelledby="reports-heading"
                sx={{
                    p: { xs: 3, sm: 5, md: 7 },
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: { xs: 2, md: 3 },
                }}
            >
                <Box
                    sx={{
                        width: 46,
                        height: 46,
                        flexShrink: 0,
                        display: 'grid',
                        placeItems: 'center',
                        borderRadius: '50%',
                        bgcolor: 'rgba(154, 108, 174, 0.16)',
                        color: palette.purpleLight,
                    }}
                >
                    <AssessmentOutlined />
                </Box>
                <Box sx={{ maxWidth: 760 }}>
                    <Typography
                        id="reports-heading"
                        component="h2"
                        sx={{ color: palette.text, fontSize: { xs: '1.85rem', sm: '2.4rem', md: '2.75rem' }, fontWeight: 650, mb: 2 }}
                    >
                        Automated reports
                    </Typography>
                    <Typography sx={{ color: palette.muted }}>
                        Turn the work you log into charts of visitor trends, common concerns, and contact time.
                        Choose a date range, explore your own activity or your whole office, and export charts for
                        your reports—without maintaining a separate spreadsheet.
                    </Typography>
                </Box>
            </Box>

            <Box
                component="footer"
                sx={{
                    mx: { xs: 3, sm: 5, md: 7 },
                    pb: 3,
                    pt: 2,
                    borderTop: `1px solid ${palette.border}`,
                }}
            >
                <Typography variant="body2" sx={{ color: palette.muted }}>
                    <Box component="span" sx={{ color: palette.text, fontWeight: 600 }}>Private alpha.</Box>{' '}
                    Ask your administrator for an invitation, or{' '}
                    <Link href="mailto:hello@ombuddi.com" sx={{ color: palette.purpleLight }}>
                        get in touch
                    </Link>{' '}
                    to learn more.
                </Typography>
            </Box>
        </Box>
    )
}
