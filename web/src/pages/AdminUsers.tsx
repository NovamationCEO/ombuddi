import React from 'react'
import {
    Alert,
    Box,
    Button,
    Checkbox,
    Chip,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    FormControlLabel,
    LinearProgress,
    Stack,
    TextField,
    Typography,
} from '@mui/material'
import { creator } from '../tools/db_tools/creator'
import { updater } from '../tools/db_tools/updater'
import { useGetter } from '../tools/db_tools/useGetter'
import { RoundedContainer } from '../components/RoundedContainer'

type AdminMetrics = {
    entriesLast30Days: number
    entriesYtd: number
    activeSeats: number
    openCases: number
    totalCases: number
}

type AdminOrganization = {
    id: string
    name: string
    subscriptionTier: string
    seatLimit: number
    seatCount: number
    totalSeatCount: number
    linkedCount: number
}

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
    isActive: boolean
    deactivatedAt: string | null
    invitation: InvitationSummary | null
}

type InvitationResult = {
    inviteUrl: string
    expiresAt: string
}


export function AdminUsers() {
    const org = useGetter<AdminOrganization>(['admin', 'organization'])
    const metrics = useGetter<AdminMetrics>(['admin', 'metrics'])
    const users = useGetter<AdminOmbuds[]>(['admin', 'ombuds'])
    const [name, setName] = React.useState('')
    const [email, setEmail] = React.useState('')
    const [isAdmin, setIsAdmin] = React.useState(false)
    const [saving, setSaving] = React.useState(false)
    const [error, setError] = React.useState('')
    const [inviteUrl, setInviteUrl] = React.useState('')
    const [editingEmailFor, setEditingEmailFor] = React.useState<string | null>(null)
    const [editingEmail, setEditingEmail] = React.useState('')
    const [statusTarget, setStatusTarget] = React.useState<AdminOmbuds | null>(null)
    const [statusReason, setStatusReason] = React.useState('')
    const [statusSaving, setStatusSaving] = React.useState(false)

    const atSeatLimit = org.data != null && org.data.seatCount >= org.data.seatLimit

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

    async function cancelInvitation(ombudsId: string) {
        setError('')
        setInviteUrl('')
        try {
            await creator(`admin/ombuds/${ombudsId}/invitation/cancel`, {})
            await users.refetch()
        } catch (reason) {
            setError(reason instanceof Error ? reason.message : 'Unable to cancel invitation')
        }
    }

    async function copyInvite() {
        await navigator.clipboard.writeText(inviteUrl)
    }

    function beginEmailEdit(user: AdminOmbuds) {
        setEditingEmailFor(user.id)
        setEditingEmail(user.email ?? '')
        setError('')
    }

    async function saveSeatEmail() {
        if (!editingEmailFor) return
        setSaving(true)
        setError('')
        setInviteUrl('')
        try {
            await updater(`admin/ombuds/${editingEmailFor}`, { email: editingEmail })
            setEditingEmailFor(null)
            setEditingEmail('')
            await users.refetch()
        } catch (reason) {
            setError(reason instanceof Error ? reason.message : 'Unable to update user email')
        } finally {
            setSaving(false)
        }
    }

    async function changeStatus() {
        if (!statusTarget) return
        setStatusSaving(true)
        setError('')
        setInviteUrl('')
        try {
            await updater(`admin/ombuds/${statusTarget.id}/status`, {
                active: !statusTarget.isActive,
                reason: statusReason,
            })
            setStatusTarget(null)
            setStatusReason('')
            await Promise.all([users.refetch(), org.refetch()])
        } catch (reason) {
            setError(reason instanceof Error ? reason.message : 'Unable to update user status')
        } finally {
            setStatusSaving(false)
        }
    }

    return (
        <Stack spacing={2} sx={{ p: 1 }}>
            <Typography variant="h5">Manage Users</Typography>

            {error && <Alert severity="error">{error}</Alert>}
            {(users.error || org.error) && (
                <Alert severity="error">
                    Unable to load users. Organization administrator access is required.
                </Alert>
            )}

            {org.data && (
                <RoundedContainer title="Organization">
                    <Stack spacing={1.5}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                            <Typography sx={{ fontWeight: 600 }}>{org.data.name}</Typography>
                            <Chip
                                label={org.data.subscriptionTier}
                                size="small"
                                variant="outlined"
                                sx={{ textTransform: 'capitalize' }}
                            />
                        </Box>
                        <Box>
                            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                                <Typography variant="body2" color="text.secondary">
                                    Seats used
                                </Typography>
                                <Typography variant="body2" color="text.secondary">
                                    {org.data.seatCount} active / {org.data.seatLimit}
                                </Typography>
                            </Box>
                            <LinearProgress
                                variant="determinate"
                                value={Math.min(100, (org.data.seatCount / org.data.seatLimit) * 100)}
                                color={atSeatLimit ? 'error' : 'primary'}
                                sx={{ borderRadius: 1, height: 6 }}
                            />
                        </Box>
                    </Stack>
                </RoundedContainer>
            )}

            {metrics.data && (
                <RoundedContainer title="Usage">
                    <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: 2 }}>
                        {[
                            { label: 'Entries (30 days)', value: metrics.data.entriesLast30Days },
                            { label: 'Entries (YTD)',     value: metrics.data.entriesYtd },
                            { label: 'Active seats',      value: metrics.data.activeSeats },
                            { label: 'Open cases',        value: metrics.data.openCases },
                            { label: 'Total cases',       value: metrics.data.totalCases },
                        ].map(({ label, value }) => (
                            <Box key={label} sx={{ textAlign: 'center', p: 1 }}>
                                <Typography variant="h4" sx={{ fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>
                                    {value}
                                </Typography>
                                <Typography variant="caption" color="text.secondary">
                                    {label}
                                </Typography>
                            </Box>
                        ))}
                    </Box>
                </RoundedContainer>
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

            {atSeatLimit ? (
                <Alert severity="warning">
                    Your organization has reached its {org.data?.seatLimit}-seat limit.
                    Contact Ombuddi to add more seats.
                </Alert>
            ) : (
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
                            required
                            helperText="The invitation can only be claimed by an Auth0 account with this verified email."
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
                            disabled={saving || !name.trim() || !email.trim()}
                        >
                            Create seat
                        </Button>
                    </Stack>
                </RoundedContainer>
            )}

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
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
                                    <Typography sx={{ fontWeight: 600 }}>{user.name}</Typography>
                                    <Chip
                                        label={user.isActive ? 'Active' : 'Deactivated'}
                                        size="small"
                                        color={user.isActive ? 'success' : 'default'}
                                        variant={user.isActive ? 'outlined' : 'filled'}
                                    />
                                </Box>
                                {editingEmailFor === user.id ? (
                                    <TextField
                                        type="email"
                                        size="small"
                                        value={editingEmail}
                                        onChange={(event) => setEditingEmail(event.target.value)}
                                        label="Invitation email"
                                        required
                                        sx={{ mt: 1 }}
                                    />
                                ) : (
                                    <Typography variant="body2">{user.email || 'No email recorded'}</Typography>
                                )}
                                <Typography variant="caption">
                                    {user.isLinked ? 'Linked' : 'Awaiting account'}
                                    {user.isAdmin ? ' · Administrator' : ''}
                                </Typography>
                            </Box>
                            <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                                {!user.isLinked && user.isActive && (
                                    editingEmailFor === user.id ? (
                                        <>
                                            <Button
                                                variant="contained"
                                                onClick={saveSeatEmail}
                                                disabled={saving || !editingEmail.trim()}
                                            >
                                                Save email
                                            </Button>
                                            <Button onClick={() => setEditingEmailFor(null)} disabled={saving}>
                                                Cancel
                                            </Button>
                                        </>
                                    ) : (
                                        <>
                                            <Button variant="text" onClick={() => beginEmailEdit(user)}>
                                                Edit email
                                            </Button>
                                            <Button
                                                variant="outlined"
                                                onClick={() => invite(user.id)}
                                                disabled={!user.email}
                                            >
                                                {user.invitation?.isActive ? 'Replace invitation' : 'Create invitation'}
                                            </Button>
                                            {user.invitation?.isActive && (
                                                <Button
                                                    color="warning"
                                                    onClick={() => cancelInvitation(user.id)}
                                                >
                                                    Cancel invitation
                                                </Button>
                                            )}
                                        </>
                                    )
                                )}
                                <Button
                                    variant={user.isActive ? 'text' : 'outlined'}
                                    color={user.isActive ? 'error' : 'primary'}
                                    onClick={() => {
                                        setStatusTarget(user)
                                        setStatusReason('')
                                        setError('')
                                    }}
                                >
                                    {user.isActive ? 'Deactivate' : 'Reactivate'}
                                </Button>
                            </Box>
                        </Box>
                    ))}
                    {!users.isLoading && (users.data?.length ?? 0) === 0 && (
                        <Typography color="text.secondary">No user seats found.</Typography>
                    )}
                </Stack>
            </RoundedContainer>

            <Dialog
                open={statusTarget !== null}
                onClose={() => !statusSaving && setStatusTarget(null)}
                fullWidth
                maxWidth="sm"
            >
                <DialogTitle>
                    {statusTarget?.isActive ? 'Deactivate user' : 'Reactivate user'}
                </DialogTitle>
                <DialogContent>
                    <Stack spacing={2} sx={{ pt: 1 }}>
                        <Typography>
                            {statusTarget?.isActive
                                ? `New requests from ${statusTarget.name} will be blocked immediately. Unused invitations for this seat will be revoked.`
                                : `${statusTarget?.name} will regain access. Reactivation uses one active seat.`}
                        </Typography>
                        <TextField
                            label="Reason (optional)"
                            value={statusReason}
                            onChange={(event) => setStatusReason(event.target.value)}
                            multiline
                            minRows={2}
                            slotProps={{ htmlInput: { maxLength: 1000 } }}
                        />
                    </Stack>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setStatusTarget(null)} disabled={statusSaving}>Cancel</Button>
                    <Button
                        onClick={changeStatus}
                        disabled={statusSaving}
                        variant="contained"
                        color={statusTarget?.isActive ? 'error' : 'primary'}
                    >
                        {statusTarget?.isActive ? 'Deactivate' : 'Reactivate'}
                    </Button>
                </DialogActions>
            </Dialog>
        </Stack>
    )
}
