import { Box, Chip, Divider, Typography } from '@mui/material'
import Grid2 from '@mui/material/Grid'
import { Stack } from '@mui/system'
import VisibilityOffIcon from '@mui/icons-material/VisibilityOff'
import LockIcon from '@mui/icons-material/Lock'
import AdminPanelSettingsIcon from '@mui/icons-material/AdminPanelSettings'
import EmailIcon from '@mui/icons-material/Email'
import monster from '../assets/images/monster.png'
import { useStyles } from '../tools/useStyles'

type PrivacyItemProps = { icon: React.ReactNode; text: string }

function PrivacyItem({ icon, text }: PrivacyItemProps) {
    return (
        <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1.5 }}>
            <Box sx={{ mt: 0.25, flexShrink: 0, opacity: 0.85 }}>{icon}</Box>
            <Typography>{text}</Typography>
        </Box>
    )
}

type SectionProps = { title: string; children: React.ReactNode }

function Section({ title, children }: SectionProps) {
    const style = useStyles()
    return (
        <>
            <Divider />
            <Grid2 container spacing={4} sx={{ py: 3 }}>
                <Grid2 size={{ xs: 12, sm: 4, md: 3 }}>
                    <Typography
                        variant="h6"
                        sx={{
                            fontWeight: 'bold',
                            color: style.title.color,
                            borderLeft: `3px solid ${style.primary}`,
                            pl: 1.5,
                            lineHeight: 1.3,
                        }}
                    >
                        {title}
                    </Typography>
                </Grid2>
                <Grid2 size={{ xs: 12, sm: 8, md: 9 }}>
                    {children}
                </Grid2>
            </Grid2>
        </>
    )
}

export function WelcomePage() {
    const style = useStyles()

    return (
        <Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 3, pb: 3 }}>
                <img src={monster} width={72} height={72} alt="Ombuddi mascot" />
                <Box>
                    <Typography variant="h4" sx={{ fontWeight: 'bold', color: style.title.color }}>
                        Ombuddi
                    </Typography>
                    <Typography variant="subtitle1" sx={{ opacity: 0.7 }}>
                        Private by design. Built for Ombuds.
                    </Typography>
                </Box>
            </Box>

            <Section title="What Is Ombuddi?">
                <Typography>
                    Ombuddi is case-logging and reporting software built specifically for Ombuds practitioners.
                    Visitor information is kept private by design — names are never stored in plaintext, and
                    case notes are encrypted before they leave your browser. Only you can read what you've recorded.
                </Typography>
            </Section>

            <Section title="Why Does It Exist?">
                <Typography>
                    Most Ombuds offices make do with tools that were never designed for confidentiality: student-conduct
                    systems, spreadsheets, or general-purpose case management platforms that don't understand IOA
                    standards. Ombuddi was created by an Ombuds practitioner to fill that gap — the first application
                    built specifically for the role.
                </Typography>
            </Section>

            <Section title="Privacy by Design">
                <Typography gutterBottom>
                    The IOA requires that Ombuds maintain strict confidentiality. Ombuddi enforces this at the
                    technical level:
                </Typography>
                <Stack spacing={1.5} sx={{ mt: 1.5 }}>
                    <PrivacyItem
                        icon={<VisibilityOffIcon color="primary" />}
                        text="Visitor identities are stored as one-way cryptographic hashes — the application cannot reveal who you spoke with."
                    />
                    <PrivacyItem
                        icon={<LockIcon color="primary" />}
                        text="Case notes are encrypted with AES-256-GCM before they leave your browser."
                    />
                    <PrivacyItem
                        icon={<AdminPanelSettingsIcon color="primary" />}
                        text="Ombuddi staff cannot access visitor data. There is no support backdoor."
                    />
                </Stack>
            </Section>

            <Section title="Get Started">
                <Typography gutterBottom>
                    Ombuddi is currently in private alpha. If your organization is participating, ask your
                    administrator for an invitation link to create your account.
                </Typography>
                <Typography gutterBottom>
                    If you're interested in bringing Ombuddi to your organization, reach out:
                </Typography>
                <Chip
                    component="a"
                    href="mailto:hello@ombuddi.com"
                    icon={<EmailIcon />}
                    label="hello@ombuddi.com"
                    clickable
                    color="primary"
                    sx={{ mt: 0.5 }}
                />
            </Section>

            <Divider />
        </Box>
    )
}
