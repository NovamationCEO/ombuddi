import { Box, Typography, List, ListItem, ListItemText } from '@mui/material'
import { Stack } from '@mui/system'

export function WelcomePage() {
    return (
        <Box sx={{ p: 2, maxWidth: 720 }}>
            <Stack spacing={3}>
                <Box>
                    <Typography variant="h5" gutterBottom>Welcome to Ombuddi</Typography>
                    <Typography>
                        Ombuddi is case-logging and reporting software built specifically for Ombuds practitioners.
                        Visitor information is kept private by design — names are never stored in plaintext, and
                        case notes are encrypted before they leave your browser. Only you can read what you've recorded.
                    </Typography>
                </Box>

                <Box>
                    <Typography variant="h6" gutterBottom>Why Does It Exist?</Typography>
                    <Typography>
                        Most Ombuds offices make do with tools that were never designed for confidentiality: student-conduct
                        systems, spreadsheets, or general-purpose case management platforms that don't understand IOA
                        standards. Ombuddi was created by an Ombuds practitioner to fill that gap — the first application
                        built specifically for the role.
                    </Typography>
                </Box>

                <Box>
                    <Typography variant="h6" gutterBottom>Privacy by Design</Typography>
                    <Typography gutterBottom>
                        The IOA requires that Ombuds maintain strict confidentiality. Ombuddi enforces this at the
                        technical level:
                    </Typography>
                    <List dense disablePadding sx={{ pl: 2 }}>
                        <ListItem disableGutters>
                            <ListItemText primary="Visitor identities are stored as one-way cryptographic hashes — the application cannot reveal who you spoke with." />
                        </ListItem>
                        <ListItem disableGutters>
                            <ListItemText primary="Case notes are encrypted with AES-256-GCM before they leave your browser." />
                        </ListItem>
                        <ListItem disableGutters>
                            <ListItemText primary="Ombuddi staff cannot access visitor data. There is no support backdoor." />
                        </ListItem>
                    </List>
                </Box>

                <Box>
                    <Typography variant="h6" gutterBottom>How Do I Get Started?</Typography>
                    <Typography>
                        Ombuddi is currently in private alpha. If your organization is participating, ask your
                        administrator for an invitation link to create your account. If you're interested in bringing
                        Ombuddi to your organization, reach out at{' '}
                        <Box component="a" href="mailto:hello@ombuddi.com" sx={{ color: 'inherit' }}>
                            hello@ombuddi.com
                        </Box>
                        .
                    </Typography>
                </Box>
            </Stack>
        </Box>
    )
}
