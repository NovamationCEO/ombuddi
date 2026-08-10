import React from 'react'
import {
    Alert,
    Box,
    Button,
    Checkbox,
    FormControlLabel,
    Stack,
    TextField,
    Typography,
} from '@mui/material'
import { creator } from '../tools/db_tools/creator'
import { useGetter } from '../tools/db_tools/useGetter'
import { RoundedContainer } from '../components/RoundedContainer'


type InvitationSummary = {
    id: string
    createdAt: string
    expiresAt: string
    claimedAt: string | null
    revokedAt: string | null
    isActive: boolean
}

type AdminOmbuds = {
    id: string
    name: string
    email: string | null
    isAdmin: boolean
    isLinked: boolean
    invitation: InvitationSummary | null
}

type InvitationResult = {
    inviteUrl: string
    expiresAt: string
}


export function AdminUsers() {
    const users = useGetter<AdminOmbuds[]>(['admin', 'ombuds'])
    const [name, setName] = React.useState('')
    const [email, setEmail] = React.useState('')
    const [isAdmin, setIsAdmin] = React.useState(false)
    const [saving, setSaving] = React.useState(false)
    const [error, setError] = React.useState('')
    const [inviteUrl, setInviteUrl] = React.useState('')

    async function createSeat() {
        setSaving(true)
        setError('')
        try {
            await creator('admin/ombuds', { name, email, isAdmin })
            setName('')
            setEmail('')
            setIsAdmin(false)
            await users.refetch()
        } catch (reason) {
            setError(reason instanceof Error ? reason.message : 'Unable to create user seat')
        } finally {
            setSaving(false)
        }
    }

    async function invite(ombudsId: string) {
        setError('')
        setInviteUrl('')
        try {
            const result = await creator<InvitationResult>(
                `admin/ombuds/${ombudsId}/invitation`,
                {},
            )
            setInviteUrl(result.inviteUrl)
            await users.refetch()
        } catch (reason) {
            setError(reason instanceof Error ? reason.message : 'Unable to create invitation')
        }
    }

    async function copyInvite() {
        await navigator.clipboard.writeText(inviteUrl)
    }

    return (
        <Stack spacing={2} sx={{ p: 1 }}>
            <Typography variant="h5">Manage Users</Typography>

            {error && <Alert severity="error">{error}</Alert>}
            {users.error && (
                <Alert severity="error">
                    Unable to load users. Organization administrator access is required.
                </Alert>
            )}

            {inviteUrl && (
                <Alert severity="success">
                    <Stack spacing={1}>
                        <Box>This invitation link is shown only now. Copy it before leaving this page.</Box>
                        <TextField value={inviteUrl} fullWidth slotProps={{ input: { readOnly: true } }} />
                        <Button onClick={copyInvite} variant="outlined">Copy invitation link</Button>
                    </Stack>
                </Alert>
            )}

            <RoundedContainer title="Create user seat">
                <Stack spacing={2}>
                    <TextField
                        label="Name"
                        value={name}
                        onChange={(event) => setName(event.target.value)}
                        required
                    />
                    <TextField
                        label="Email"
                        type="email"
                        value={email}
                        onChange={(event) => setEmail(event.target.value)}
                    />
                    <FormControlLabel
                        control={(
                            <Checkbox
                                checked={isAdmin}
                                onChange={(event) => setIsAdmin(event.target.checked)}
                            />
                        )}
                        label="Organization administrator"
                    />
                    <Button
                        variant="contained"
                        onClick={createSeat}
                        disabled={saving || !name.trim()}
                    >
                        Create seat
                    </Button>
                </Stack>
            </RoundedContainer>

            <RoundedContainer title="Organization users">
                <Stack spacing={1.5}>
                    {(users.data ?? []).map((user) => (
                        <Box
                            key={user.id}
                            sx={{
                                display: 'flex',
                                gap: 2,
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                p: 1.5,
                                border: 1,
                                borderColor: 'divider',
                                borderRadius: 1,
                            }}
                        >
                            <Box>
                                <Typography sx={{ fontWeight: 600 }}>{user.name}</Typography>
                                <Typography variant="body2">{user.email || 'No email recorded'}</Typography>
                                <Typography variant="caption">
                                    {user.isLinked ? 'Linked' : 'Awaiting account'}
                                    {user.isAdmin ? ' · Administrator' : ''}
                                </Typography>
                            </Box>
                            {!user.isLinked && (
                                <Button variant="outlined" onClick={() => invite(user.id)}>
                                    {user.invitation?.isActive ? 'Replace invitation' : 'Create invitation'}
                                </Button>
                            )}
                        </Box>
                    ))}
                    {!users.isLoading && (users.data?.length ?? 0) === 0 && (
                        <Typography color="text.secondary">No user seats found.</Typography>
                    )}
                </Stack>
            </RoundedContainer>
        </Stack>
    )
}
