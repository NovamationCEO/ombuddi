import { DarkModeOutlined, LightModeOutlined, LockOutlined } from '@mui/icons-material'
import {
    Alert,
    Box,
    Button,
    CircularProgress,
    Stack,
    TextField,
    ToggleButton,
    ToggleButtonGroup,
    Typography,
} from '@mui/material'
import { useColorScheme } from '@mui/material/styles'
import { useEffect, useState } from 'react'
import { RoundedContainer } from '../components/RoundedContainer'
import { useOrganizationResult } from '../tools/useOrganization'
import { useCurrentOmbuds } from '../tools/useCurrentOmbuds'
import { useSessionSalt } from '../libraries/useSessionSalt'
import { AccountDiagnostics } from '../components/profile/AccountDiagnostics'
import { updater } from '../tools/db_tools/updater'
import { useSnack } from '../libraries/useSnack'

export function Profile() {
    const ombudsRes = useCurrentOmbuds()
    const organizationRes = useOrganizationResult()
    const { colorScheme, setMode } = useColorScheme()
    const { sessionSalt, setSessionSalt, clearSessionSalt } = useSessionSalt()
    const setSnack = useSnack((state) => state.setSnack)
    const [name, setName] = useState('')
    const [savingName, setSavingName] = useState(false)

    useEffect(() => {
        if (ombudsRes.data?.name !== undefined) setName(ombudsRes.data.name)
    }, [ombudsRes.data?.name])

    async function saveName() {
        const trimmedName = name.trim()
        if (!trimmedName) return

        setSavingName(true)
        try {
            await updater<{ name: string }>('update_current_ombuds', { name: trimmedName })
            setName(trimmedName)
            await ombudsRes.refetch()
            setSnack({ message: 'Name updated.', severity: 'success' })
        } catch {
            setSnack({ message: 'Failed to update your name.', severity: 'error' })
        } finally {
            setSavingName(false)
        }
    }

    const profileLoadError = ombudsRes.error || organizationRes.error

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
                        {profileLoadError && (
                            <Alert
                                severity="error"
                                action={
                                    <Button
                                        color="inherit"
                                        size="small"
                                        onClick={() => {
                                            void ombudsRes.refetch()
                                            void organizationRes.refetch()
                                        }}
                                    >
                                        Retry
                                    </Button>
                                }
                            >
                                Ombuddi could not load your linked user or organization. Check Account Diagnostics for
                                the specific account status.
                            </Alert>
                        )}
                        <TextField
                            value={name}
                            onChange={(event) => setName(event.target.value)}
                            label="Name"
                            helperText="Initially set by your administrator; you can update it here."
                            fullWidth
                            disabled={ombudsRes.isLoading || !ombudsRes.data}
                            slotProps={{ htmlInput: { maxLength: 200 } }}
                            sx={{
                                '& .MuiInputLabel-root': { color: 'text.secondary' },
                                '& .MuiOutlinedInput-root': { color: 'text.primary', bgcolor: 'background.paper' },
                            }}
                        />
                        <Button
                            variant="contained"
                            onClick={() => void saveName()}
                            disabled={
                                savingName || !ombudsRes.data || !name.trim() || name.trim() === ombudsRes.data.name
                            }
                            sx={{ alignSelf: 'flex-start', textTransform: 'none' }}
                        >
                            {savingName ? 'Saving…' : 'Save name'}
                        </Button>

                        <Box
                            sx={{
                                p: 1.75,
                                border: '1px solid',
                                borderColor: 'divider',
                                borderRadius: 2,
                                bgcolor: 'background.default',
                            }}
                        >
                            <Typography
                                component="h3"
                                sx={{ color: 'text.secondary', fontSize: '0.78rem', fontWeight: 600, mb: 0.5 }}
                            >
                                Organization
                            </Typography>
                            {organizationRes.isLoading ? (
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                    <CircularProgress size={16} />
                                    <Typography sx={{ color: 'text.secondary' }}>Loading organization…</Typography>
                                </Box>
                            ) : (
                                <Typography sx={{ color: 'text.primary', fontWeight: 600 }}>
                                    {organizationRes.data?.name || 'Organization unavailable'}
                                </Typography>
                            )}
                            <Typography sx={{ mt: 0.5, color: 'text.secondary', fontSize: '0.78rem' }}>
                                Your invitation determines which organization you can access.
                            </Typography>
                        </Box>
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
                            <ToggleButton
                                value="dark"
                                aria-label="Dark mode"
                            >
                                <DarkModeOutlined sx={{ mr: 1 }} />
                                Dark
                            </ToggleButton>
                            <ToggleButton
                                value="light"
                                aria-label="Light mode"
                            >
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
                                This optional phrase is the session default for protected case descriptions and notes,
                                and for private-person lookup. Each protection control can instead use a blank phrase or
                                a one-time phrase. The session default exists only in this browser session and is
                                cleared on refresh, login, or logout.
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

                <AccountDiagnostics />
            </Stack>
        </Box>
    )
}
