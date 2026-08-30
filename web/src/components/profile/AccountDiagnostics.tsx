import { ExpandMore } from '@mui/icons-material'
import {
    Accordion,
    AccordionDetails,
    AccordionSummary,
    Alert,
    Box,
    Button,
    Chip,
    CircularProgress,
    Stack,
    Typography,
} from '@mui/material'
import { useNavigate } from 'react-router-dom'
import { useSessionDiagnostics } from '../../tools/useSessionDiagnostics'
import { getStoredInvitationToken } from '../../tools/auth/pendingInvitation'

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

export function AccountDiagnostics() {
    const diagnostics = useSessionDiagnostics()
    const navigate = useNavigate()
    const hasPendingInvitation = Boolean(getStoredInvitationToken())

    return (
        <Accordion
            defaultExpanded={false}
            disableGutters
            elevation={0}
            sx={{
                color: 'text.primary',
                bgcolor: 'background.paper',
                border: '1px solid',
                borderColor: 'divider',
                borderRadius: '12px !important',
                overflow: 'hidden',
                boxShadow: (theme) => `0 5px 16px ${theme.vars.palette.app.shadow}`,
                '&::before': { display: 'none' },
            }}
        >
            <AccordionSummary
                expandIcon={<ExpandMore sx={{ color: 'primary.contrastText' }} />}
                aria-controls="account-diagnostics-content"
                id="account-diagnostics-header"
                sx={{
                    px: 2,
                    minHeight: 48,
                    bgcolor: 'secondary.dark',
                    color: 'primary.contrastText',
                    '&.Mui-expanded': { minHeight: 48 },
                    '& .MuiAccordionSummary-content': { my: 1.25 },
                    '& .MuiAccordionSummary-content.Mui-expanded': { my: 1.25 },
                }}
            >
                <Typography sx={{ fontWeight: 700 }}>Account diagnostics</Typography>
            </AccordionSummary>
            <AccordionDetails id="account-diagnostics-content" sx={{ p: 2 }}>
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
                            label="Signed email claim"
                            value={!diagnostics.data.emailClaimPresent
                                ? 'Missing'
                                : diagnostics.data.emailClaimSource === 'standard'
                                    ? 'Present (standard OIDC)'
                                    : 'Present (Ombuddi claim)'}
                            color={diagnostics.data.emailClaimPresent ? 'success' : 'error'}
                        />
                        <DiagnosticRow
                            label="Email verification"
                            value={!diagnostics.data.emailClaimPresent
                                ? 'Unavailable'
                                : diagnostics.data.emailVerified ? 'Verified' : 'Not verified'}
                            color={!diagnostics.data.emailClaimPresent || !diagnostics.data.emailVerified
                                ? 'error'
                                : 'success'}
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
                        {!diagnostics.data.linked && !diagnostics.data.emailClaimPresent && (
                            <Alert severity="warning">
                                This token cannot accept an invitation because Auth0 did not include a signed email
                                claim. Sign out and reopen the invitation link to request a fresh token. If the claim
                                is still missing, an Auth0 administrator should inspect the successful login under
                                Monitoring → Logs → Action Executions and confirm the Ombuddi API audience was
                                requested.
                            </Alert>
                        )}
                        {!diagnostics.data.linked
                            && diagnostics.data.emailClaimPresent
                            && !diagnostics.data.emailVerified && (
                            <Alert severity="warning">
                                Verify this account&apos;s email address in Auth0, then sign out and reopen the
                                invitation link. The administrator role will appear after the seat is linked.
                            </Alert>
                        )}
                        {!diagnostics.data.linked
                            && diagnostics.data.emailClaimPresent
                            && diagnostics.data.emailVerified && (
                            <Alert severity="info">
                                <Stack spacing={1} sx={{ alignItems: 'flex-start' }}>
                                    <Typography>
                                        Your Auth0 identity is ready. Verification does not link the Ombuddi seat
                                        by itself; the invitation must be completed once more.
                                    </Typography>
                                    {hasPendingInvitation ? (
                                        <Button variant="contained" onClick={() => navigate('/accept-invite')}>
                                            Complete pending invitation
                                        </Button>
                                    ) : (
                                        <Typography>
                                            Reopen the original invitation link. Request a replacement only if
                                            that link is invalid or expired.
                                        </Typography>
                                    )}
                                </Stack>
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
            </AccordionDetails>
        </Accordion>
    )
}
