import { DarkModeOutlined, LightModeOutlined, LockOutlined } from '@mui/icons-material'
import { Box, Button, Stack, TextField, ToggleButton, ToggleButtonGroup, Typography } from '@mui/material'
import { useColorScheme } from '@mui/material/styles'
import { RoundedContainer } from '../components/RoundedContainer'
import { useOrganization } from '../tools/useOrganization'
import { useCurrentOmbuds } from '../tools/useCurrentOmbuds'
import { useSessionSalt } from '../libraries/useSessionSalt'

export function Profile() {
    const ombudsRes = useCurrentOmbuds()
    const organization = useOrganization()
    const { colorScheme, setMode } = useColorScheme()
    const { sessionSalt, setSessionSalt, clearSessionSalt } = useSessionSalt()

    return (
        <Box
            sx={{
                minHeight: '100%',
                boxSizing: 'border-box',
                bgcolor: 'background.default',
                color: 'text.primary',
                p: { xs: 2, sm: 3, lg: 4 },
            }}
        >
            <Stack
                spacing={2.5}
                sx={{ width: '100%', maxWidth: 900, mx: 'auto' }}
            >
                <Box>
                    <Typography
                        variant="h4"
                        component="h1"
                        sx={{ color: 'text.primary', fontWeight: 700 }}
                    >
                        Profile
                    </Typography>
                    <Typography sx={{ mt: 0.5, color: 'text.secondary' }}>
                        Your Ombuddi account and organization access.
                    </Typography>
                </Box>

                <RoundedContainer title="Personal information">
                    <Stack spacing={2}>
                        <TextField
                            value={ombudsRes.data?.name ?? ''}
                            label="Name"
                            helperText="Set by the administrator who created your invitation."
                            fullWidth
                            slotProps={{ input: { readOnly: true } }}
                            sx={{
                                '& .MuiInputLabel-root': { color: 'text.secondary' },
                                '& .MuiOutlinedInput-root': { color: 'text.primary', bgcolor: 'background.paper' },
                            }}
                        />
                        <TextField
                            value={organization.name ?? ''}
                            label="Organization"
                            helperText="Your invitation determines which organization you can access."
                            fullWidth
                            slotProps={{ input: { readOnly: true } }}
                            sx={{
                                '& .MuiInputLabel-root': { color: 'text.secondary' },
                                '& .MuiOutlinedInput-root': { color: 'text.primary', bgcolor: 'background.paper' },
                            }}
                        />
                    </Stack>
                </RoundedContainer>

                <RoundedContainer title="Appearance">
                    <Stack spacing={1.5}>
                        <Typography sx={{ color: 'text.secondary' }}>
                            Choose the color theme used on signed-in pages.
                        </Typography>
                        <ToggleButtonGroup
                            exclusive
                            value={colorScheme ?? 'dark'}
                            onChange={(_event, mode: 'light' | 'dark' | null) => {
                                if (mode) setMode(mode)
                            }}
                            aria-label="Color theme"
                            sx={{ alignSelf: 'flex-start' }}
                        >
                            <ToggleButton value="dark" aria-label="Dark mode">
                                <DarkModeOutlined sx={{ mr: 1 }} />
                                Dark
                            </ToggleButton>
                            <ToggleButton value="light" aria-label="Light mode">
                                <LightModeOutlined sx={{ mr: 1 }} />
                                Light
                            </ToggleButton>
                        </ToggleButtonGroup>
                    </Stack>
                </RoundedContainer>

                <RoundedContainer title="Session security">
                    <Stack spacing={1.5}>
                        <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1.25 }}>
                            <LockOutlined sx={{ mt: 0.25, color: 'primary.main' }} />
                            <Typography sx={{ color: 'text.secondary' }}>
                                This optional phrase pre-fills salt fields and is used to encrypt and decrypt entry
                                notes. It exists only in this browser session and is cleared on refresh, login, or
                                logout.
                            </Typography>
                        </Box>
                        <TextField
                            type="password"
                            label="Session Salt Phrase"
                            value={sessionSalt ?? ''}
                            onChange={(event) => setSessionSalt(event.target.value)}
                            autoComplete="off"
                            fullWidth
                            sx={{
                                '& .MuiInputLabel-root': { color: 'text.secondary' },
                                '& .MuiOutlinedInput-root': { color: 'text.primary', bgcolor: 'background.paper' },
                            }}
                        />
                        <Button
                            variant="outlined"
                            onClick={clearSessionSalt}
                            disabled={!sessionSalt}
                            sx={{ alignSelf: 'flex-start', textTransform: 'none' }}
                        >
                            Clear phrase
                        </Button>
                    </Stack>
                </RoundedContainer>
            </Stack>
        </Box>
    )
}
