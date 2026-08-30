import React from 'react'
import { Alert, Button, CircularProgress, Stack, Typography } from '@mui/material'
import { useAuth0 } from '@auth0/auth0-react'
import { creator } from '../tools/db_tools/creator'
import { RoundedContainer } from '../components/RoundedContainer'
import { useNavigate } from 'react-router-dom'
import {
    clearPendingInvitationToken,
    loadPendingInvitationToken,
} from '../tools/auth/pendingInvitation'


export function AcceptInvitation() {
    const { isAuthenticated, isLoading, loginWithRedirect } = useAuth0()
    const [claiming, setClaiming] = React.useState(false)
    const [error, setError] = React.useState('')
    const [errorCode, setErrorCode] = React.useState('')
    const [token] = React.useState(loadPendingInvitationToken)
    const claimAttempted = React.useRef(false)
    const navigate = useNavigate()
    const returnTo = `/accept-invite?token=${encodeURIComponent(token)}`

    React.useEffect(() => {
        if (token && window.location.search) {
            window.history.replaceState({}, document.title, '/accept-invite')
        }
    }, [token])

    async function authenticate(mode: 'signup' | 'login') {
        setError('')
        setErrorCode('')
        await loginWithRedirect({
            appState: { returnTo },
            authorizationParams: {
                prompt: 'login',
                ...(mode === 'signup' ? { screen_hint: 'signup' } : {}),
            },
        })
    }

    const accept = React.useCallback(async () => {
        if (!token || claimAttempted.current) return

        claimAttempted.current = true
        setClaiming(true)
        setError('')
        setErrorCode('')
        try {
            await creator('auth/claim-invitation', { token })
            clearPendingInvitationToken()
            navigate('/profile', { replace: true })
        } catch (reason) {
            const message = reason instanceof Error ? reason.message : 'Unable to accept invitation'
            const code = message.match(/\(([A-Z0-9_]+)\)$/)?.[1] ?? ''
            setError(message)
            setErrorCode(code)
            setClaiming(false)
            claimAttempted.current = false
        }
    }, [navigate, token])

    React.useEffect(() => {
        if (!isLoading && isAuthenticated && token) {
            void accept()
        }
    }, [accept, isAuthenticated, isLoading, token])

    if (isLoading) {
        return <CircularProgress />
    }

    return (
        <Stack spacing={2} sx={{ p: 1, maxWidth: 640, mx: 'auto' }}>
            <Typography variant="h5">Join Ombuddi</Typography>
            <RoundedContainer title="Accept invitation">
                <Stack spacing={2}>
                    {!token && <Alert severity="error">This invitation link is incomplete.</Alert>}
                    {error && <Alert severity="error">{error}</Alert>}
                    {errorCode === 'VERIFIED_EMAIL_REQUIRED' && (
                        <Alert severity="warning">
                            Auth0 created your account, but your email address is still awaiting verification. Check
                            your inbox and spam folder for a separate verification message. After verifying, return
                            here and sign in again. If no message arrives, contact the inviting administrator.
                        </Alert>
                    )}
                    <Typography>
                        Your name and organization have already been recorded with this invitation. Create an Auth0
                        account using the invited email address, or sign in if you already have one.
                    </Typography>
                    {!isAuthenticated && (
                        <Alert severity="info">
                            After signup, Auth0 sends a separate email-verification message. Ombuddi cannot finish
                            linking the account until that address is verified.
                        </Alert>
                    )}
                    {!token ? null : !isAuthenticated ? (
                        <Stack spacing={1} sx={{ alignItems: 'flex-start' }}>
                            <Button variant="contained" onClick={() => void authenticate('signup')} disabled={!token}>
                                Create account to accept invitation
                            </Button>
                            <Button variant="text" onClick={() => void authenticate('login')} disabled={!token}>
                                I already have an Auth0 account
                            </Button>
                        </Stack>
                    ) : error ? (
                        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} sx={{ alignItems: 'flex-start' }}>
                            {errorCode === 'VERIFIED_EMAIL_REQUIRED' && (
                                <Button
                                    variant="contained"
                                    onClick={() => void authenticate('login')}
                                    disabled={!token || claiming}
                                >
                                    I verified my email — sign in again
                                </Button>
                            )}
                            <Button
                                variant={errorCode === 'VERIFIED_EMAIL_REQUIRED' ? 'outlined' : 'contained'}
                                onClick={accept}
                                disabled={!token || claiming}
                            >
                                Try again
                            </Button>
                        </Stack>
                    ) : (
                        <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center' }}>
                            <CircularProgress size={20} />
                            <Typography>Linking your Ombuddi account…</Typography>
                        </Stack>
                    )}
                </Stack>
            </RoundedContainer>
        </Stack>
    )
}
