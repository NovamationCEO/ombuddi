import { DarkModeOutlined, LightModeOutlined, LockOutlined } from '@mui/icons-material'
import {
    Alert,
    Box,
    Button,
    Chip,
    CircularProgress,
    Stack,
    TextField,
    ToggleButton,
    ToggleButtonGroup,
    Typography,
} from '@mui/material'
import { useColorScheme } from '@mui/material/styles'
import { RoundedContainer } from '../components/RoundedContainer'
import { useOrganization } from '../tools/useOrganization'
import { useCurrentOmbuds } from '../tools/useCurrentOmbuds'
import { useSessionSalt } from '../libraries/useSessionSalt'
import { useSessionDiagnostics } from '../tools/useSessionDiagnostics'

function DiagnosticRow(props: {
    label: string
    value: string
    color?: 'default' | 'success' | 'warning' | 'error' | 'info'
}) {
    return (
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 2 }}>
            <Typography sx={{ color: 'text.secondary' }}>{props.label}</Typography>
            <Chip size="small" label={props.value} color={props.color ?? 'default'} variant="outlined" />
        </Box>
    )
}

export function Profile() {
    const ombudsRes = useCurrentOmbuds()
    const organization = useOrganization()
    const { colorScheme, setMode } = useColorScheme()
    const { sessionSalt, setSessionSalt, clearSessionSalt } = useSessionSalt()
    const diagnostics = useSessionDiagnostics()

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

                <RoundedContainer title="Account diagnostics">
                    {diagnostics.isLoading && (
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <CircularProgress size={18} />
                            <Typography color="text.secondary">Checking your authenticated session…</Typography>
                        </Box>
                    )}
                    {diagnostics.error && (
                        <Stack spacing={1.5}>
                            <Alert severity="error">
                                The API could not return session diagnostics.{' '}
                                {diagnostics.error instanceof Error ? diagnostics.error.message : 'Please try again.'}
                            </Alert>
                            <Button
                                variant="outlined"
                                onClick={() => void diagnostics.refetch()}
                                sx={{ alignSelf: 'flex-start', textTransform: 'none' }}
                            >
                                Retry diagnostics
                            </Button>
                        </Stack>
                    )}
                    {diagnostics.data && (
                        <Stack spacing={1.5}>
                            <Alert severity={diagnostics.data.canAccessApplication ? 'success' : 'error'}>
                                {diagnostics.data.message}
                            </Alert>
                            <DiagnosticRow label="Diagnostic code" value={diagnostics.data.code} color="info" />
                            <DiagnosticRow
                                label="API authentication"
                                value={diagnostics.data.authenticated ? 'Valid' : 'Invalid'}
                                color={diagnostics.data.authenticated ? 'success' : 'error'}
                            />
                            <DiagnosticRow
                                label="Ombuddi user seat"
                                value={!diagnostics.data.linked
                                    ? 'Not linked'
                                    : diagnostics.data.accountActive ? 'Linked and active' : 'Deactivated'}
                                color={!diagnostics.data.linked || !diagnostics.data.accountActive ? 'error' : 'success'}
                            />
                            <DiagnosticRow
                                label="Organization"
                                value={diagnostics.data.organizationActive === null
                                    ? 'Unavailable'
                                    : diagnostics.data.organizationActive ? 'Active' : 'Deactivated'}
                                color={diagnostics.data.organizationActive === null
                                    ? 'default'
                                    : diagnostics.data.organizationActive ? 'success' : 'error'}
                            />
                            <DiagnosticRow
                                label="Auth0 organization claim"
                                value={!diagnostics.data.organizationClaimPresent
                                    ? 'Not included (allowed)'
                                    : diagnostics.data.organizationClaimMatches ? 'Matches seat' : 'Does not match'}
                                color={!diagnostics.data.organizationClaimPresent || diagnostics.data.organizationClaimMatches
                                    ? 'success'
                                    : 'error'}
                            />
                            <DiagnosticRow
                                label="Verified email claim"
                                value={diagnostics.data.emailClaimPresent && diagnostics.data.emailVerified
                                    ? 'Present and verified'
                                    : 'Missing or unverified'}
                                color={diagnostics.data.emailClaimPresent && diagnostics.data.emailVerified
                                    ? 'success'
                                    : 'warning'}
                            />
                            <DiagnosticRow
                                label="Organization administrator"
                                value={diagnostics.data.isOrganizationAdmin ? 'Yes' : 'No'}
                                color={diagnostics.data.isOrganizationAdmin ? 'success' : 'default'}
                            />
                            <DiagnosticRow
                                label="System administrator"
                                value={diagnostics.data.isSystemAdmin ? 'Yes' : 'No'}
                                color={diagnostics.data.isSystemAdmin ? 'success' : 'default'}
                            />
                            {diagnostics.data.canAccessApplication && !diagnostics.data.isOrganizationAdmin && (
                                <Alert severity="info">
                                    Normal case and profile activity is permitted. Organization and user-management
                                    changes require an organization administrator.
                                </Alert>
                            )}
                            <Button
                                variant="outlined"
                                onClick={() => void diagnostics.refetch()}
                                sx={{ alignSelf: 'flex-start', textTransform: 'none' }}
                            >
                                Refresh diagnostics
                            </Button>
                        </Stack>
                    )}
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
