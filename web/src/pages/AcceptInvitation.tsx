import React from 'react'
import { Alert, Button, CircularProgress, Stack, Typography } from '@mui/material'
import { useAuth0 } from '@auth0/auth0-react'
import { creator } from '../tools/db_tools/creator'
import { RoundedContainer } from '../components/RoundedContainer'


export function AcceptInvitation() {
    const { isAuthenticated, isLoading, loginWithRedirect } = useAuth0()
    const [claiming, setClaiming] = React.useState(false)
    const [error, setError] = React.useState('')
    const token = new URLSearchParams(window.location.search).get('token') ?? ''
    const returnTo = `/accept-invite?token=${encodeURIComponent(token)}`

    async function signIn() {
        await loginWithRedirect({ appState: { returnTo } })
    }

    async function accept() {
        setClaiming(true)
        setError('')
        try {
            await creator('auth/claim-invitation', { token })
            window.location.assign('/')
        } catch (reason) {
            setError(reason instanceof Error ? reason.message : 'Unable to accept invitation')
            setClaiming(false)
        }
    }

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
                        Sign in with the Auth0 account whose verified email matches this invitation.
                    </Typography>
                    {!isAuthenticated ? (
                        <Button variant="contained" onClick={signIn} disabled={!token}>
                            Sign in to continue
                        </Button>
                    ) : (
                        <Button variant="contained" onClick={accept} disabled={!token || claiming}>
                            Accept invitation
                        </Button>
                    )}
                </Stack>
            </RoundedContainer>
        </Stack>
    )
}
