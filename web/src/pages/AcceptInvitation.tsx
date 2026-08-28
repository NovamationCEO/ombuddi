import React from 'react'
import { Alert, Button, CircularProgress, Stack, Typography } from '@mui/material'
import { useAuth0 } from '@auth0/auth0-react'
import { creator } from '../tools/db_tools/creator'
import { RoundedContainer } from '../components/RoundedContainer'
import { useNavigate } from 'react-router-dom'


export function AcceptInvitation() {
    const { isAuthenticated, isLoading, loginWithRedirect } = useAuth0()
    const [claiming, setClaiming] = React.useState(false)
    const [error, setError] = React.useState('')
    const [token] = React.useState(() => new URLSearchParams(window.location.search).get('token') ?? '')
    const claimAttempted = React.useRef(false)
    const navigate = useNavigate()
    const returnTo = `/accept-invite?token=${encodeURIComponent(token)}`

    React.useEffect(() => {
        if (token && window.location.search) {
            window.history.replaceState({}, document.title, '/accept-invite')
        }
    }, [token])

    async function signIn() {
        await loginWithRedirect({ appState: { returnTo } })
    }

    const accept = React.useCallback(async () => {
        if (!token || claimAttempted.current) return

        claimAttempted.current = true
        setClaiming(true)
        setError('')
        try {
            await creator('auth/claim-invitation', { token })
            navigate('/profile', { replace: true })
        } catch (reason) {
            setError(reason instanceof Error ? reason.message : 'Unable to accept invitation')
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
                    <Typography>
                        Sign in with the Auth0 account whose verified email matches this invitation. Your name and
                        organization will come from the invitation.
                    </Typography>
                    {!token ? null : !isAuthenticated ? (
                        <Button variant="contained" onClick={signIn} disabled={!token}>
                            Sign in to continue
                        </Button>
                    ) : error ? (
                        <Button variant="contained" onClick={accept} disabled={!token || claiming}>
                            Try again
                        </Button>
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
