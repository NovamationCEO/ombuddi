import { InvitationEmailHistory } from '../components/InvitationEmailHistory'
import { InvitationDelivery, invitationSeverity, type EmailDelivery } from '../components/InvitationDelivery'
import React from 'react'
import { useAdminAction } from '../libraries/useAdminAction'
import { useSnack } from '../libraries/useSnack'
import { useQueryClient } from '@tanstack/react-query'
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
    emailDelivery?: EmailDelivery
    inviteUrl: string
    expiresAt: string
}

export function AdminUsers() {
    const queryClient = useQueryClient()
    const org = useGetter<AdminOrganization>(['admin', 'organization'])
    const metrics = useGetter<AdminMetrics>(['admin', 'metrics'])
    const users = useGetter<AdminOmbuds[]>(['admin', 'ombuds'])
    const [inviteDelivery, setInviteDelivery] = React.useState<EmailDelivery>()
    const [name, setName] = React.useState('')
    const [email, setEmail] = React.useState('')
    const [isAdmin, setIsAdmin] = React.useState(false)
    const [inviteUrl, setInviteUrl] = React.useState('')
    const [editingEmailFor, setEditingEmailFor] = React.useState<string | null>(null)
    const [editingEmail, setEditingEmail] = React.useState('')
    const [statusTarget, setStatusTarget] = React.useState<AdminOmbuds | null>(null)
    const [statusReason, setStatusReason] = React.useState('')

    const [createOpen, setCreateOpen] = React.useState(false)
    const setSnack = useSnack((state) => state.setSnack)

    const atSeatLimit = org.data != null && org.data.seatCount >= org.data.seatLimit

    const { run, busy, pending, error, clearError } = useAdminAction(async () => {
        await Promise.all([users.refetch(), org.refetch(), metrics.refetch()])
    })
    const [historySeat, setHistorySeat] = React.useState<AdminOmbuds | null>(null)
    const [copyError, setCopyError] = React.useState('')

    async function createSeat() {
        if (!org.data || atSeatLimit) return
        await run(
            async () => {
                await creator('admin/ombuds', { name, email, isAdmin })
                setName('')
                setEmail('')
                setIsAdmin(false)
                setCreateOpen(false)
                setSnack({
                    message: 'User seat created. Create an invitation from the user list when ready.',
                    severity: 'success',
                })
            },
            'Unable to create user seat',
            'create',
        )
    }
    async function invite(ombudsId: string) {
        await run(
            async () => {
                setCopyError('')
                const result = await creator<InvitationResult>(`admin/ombuds/${ombudsId}/invitation`, {})
                setInviteUrl(result.inviteUrl)
                setInviteDelivery(result.emailDelivery)
                await queryClient.invalidateQueries({
                    queryKey: ['admin', 'ombuds', ombudsId, 'email-history'],
                    exact: true,
                })
            },
            'Unable to create invitation',
            ombudsId,
        )
    }
    async function cancelInvitation(ombudsId: string) {
        await run(
            () => creator(`admin/ombuds/${ombudsId}/invitation/cancel`, {}),
            'Unable to cancel invitation',
            ombudsId,
        )
    }
    async function copyInvite() {
        setCopyError('')
        try {
            await navigator.clipboard.writeText(inviteUrl)
            setSnack({ message: 'Invitation link copied.', severity: 'success' })
        } catch {
            setCopyError('Unable to copy automatically. Select and copy the invitation link.')
        }
    }
    function beginEmailEdit(user: AdminOmbuds) {
        setEditingEmailFor(user.id)
        setEditingEmail(user.email ?? '')
        clearError()
    }
    async function saveSeatEmail() {
        if (!editingEmailFor) return
        await run(
            async () => {
                await updater(`admin/ombuds/${editingEmailFor}`, { email: editingEmail })
                setEditingEmailFor(null)
                setEditingEmail('')
            },
            'Unable to update user email',
            editingEmailFor,
        )
    }
    async function changeStatus() {
        if (!statusTarget) return
        await run(
            async () => {
                await updater(`admin/ombuds/${statusTarget.id}/status`, {
                    active: !statusTarget.isActive,
                    reason: statusReason,
                })
                setStatusTarget(null)
                setStatusReason('')
            },
            'Unable to update user status',
            statusTarget.id,
        )
    }

    return (
        <Stack
            spacing={2}
            sx={{ p: 1 }}
        >
            <Typography variant="h5">Manage Users</Typography>

            {historySeat && (
                <Dialog
                    open
                    onClose={() => setHistorySeat(null)}
                    fullWidth
                    maxWidth="md"
                    aria-labelledby="email-history-title"
                >
                    <DialogTitle id="email-history-title">Email history — {historySeat.name}</DialogTitle>
                    <DialogContent>
                        <InvitationEmailHistory
                            key={historySeat.id}
                            endpoint={['admin', 'ombuds', historySeat.id, 'email-history']}
                        />
                    </DialogContent>
                    <DialogActions>
                        <Button onClick={() => setHistorySeat(null)}>Close history</Button>
                    </DialogActions>
                </Dialog>
            )}
            {(users.error || org.error) && (
                <Alert severity="error">Unable to load users. Organization administrator access is required.</Alert>
            )}

            {(org.data || metrics.data) && (
                <RoundedContainer title="Usage">
                    <Stack spacing={2}>
                        {org.data && (
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, flexWrap: 'wrap' }}>
                                <Typography sx={{ fontWeight: 600 }}>{org.data.name}</Typography>
                                <Chip
                                    label={org.data.subscriptionTier}
                                    size="small"
                                    variant="outlined"
                                    sx={{ textTransform: 'capitalize' }}
                                />
                            </Box>
                        )}
                        <Box
                            sx={{
                                display: 'grid',
                                gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
                                gap: 2,
                            }}
                        >
                            {org.data && (
                                <Box sx={{ p: 1, textAlign: 'center' }}>
                                    <Typography
                                        variant="h4"
                                        sx={{ fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}
                                    >
                                        {org.data.seatCount}
                                        <Typography
                                            component="span"
                                            color="text.secondary"
                                        >
                                            {' '}
                                            / {org.data.seatLimit}
                                        </Typography>
                                    </Typography>
                                    <Typography
                                        variant="caption"
                                        color="text.secondary"
                                    >
                                        Seats used
                                    </Typography>
                                    <LinearProgress
                                        aria-label="Seats used"
                                        variant="determinate"
                                        value={
                                            org.data.seatLimit > 0
                                                ? Math.min(100, (org.data.seatCount / org.data.seatLimit) * 100)
                                                : 0
                                        }
                                        color={atSeatLimit ? 'error' : 'primary'}
                                        sx={{ borderRadius: 1, height: 6, mt: 1 }}
                                    />
                                </Box>
                            )}
                            {metrics.data &&
                                [
                                    { label: 'Entries (30 days)', value: metrics.data.entriesLast30Days },
                                    { label: 'Entries (YTD)', value: metrics.data.entriesYtd },
                                    { label: 'Open cases', value: metrics.data.openCases },
                                    { label: 'Total cases', value: metrics.data.totalCases },
                                ].map(({ label, value }) => (
                                    <Box
                                        key={label}
                                        sx={{ textAlign: 'center', p: 1 }}
                                    >
                                        <Typography
                                            variant="h4"
                                            sx={{ fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}
                                        >
                                            {value}
                                        </Typography>
                                        <Typography
                                            variant="caption"
                                            color="text.secondary"
                                        >
                                            {label}
                                        </Typography>
                                    </Box>
                                ))}
                        </Box>
                        {metrics.error && <Alert severity="warning">Unable to load usage metrics.</Alert>}
                        {atSeatLimit && (
                            <Alert severity="warning">
                                Your organization has reached its {org.data?.seatLimit}-seat limit. Contact Ombuddi to
                                add more seats.
                            </Alert>
                        )}
                    </Stack>
                </RoundedContainer>
            )}

            {inviteUrl && (
                <Dialog
                    open
                    fullWidth
                    maxWidth="sm"
                    aria-labelledby="invitation-result-title"
                >
                    <DialogTitle id="invitation-result-title">Invitation created</DialogTitle>
                    <DialogContent>
                        {copyError && <Alert severity="error">{copyError}</Alert>}
                        <Alert severity={invitationSeverity(inviteDelivery)}>
                            <Stack spacing={1}>
                                <InvitationDelivery delivery={inviteDelivery} />
                                <TextField
                                    label="Invitation link"
                                    value={inviteUrl}
                                    fullWidth
                                    slotProps={{ input: { readOnly: true } }}
                                />
                                <Button
                                    onClick={copyInvite}
                                    variant="outlined"
                                >
                                    Copy invitation link
                                </Button>
                            </Stack>
                        </Alert>
                    </DialogContent>
                    <DialogActions>
                        <Button onClick={() => setInviteUrl('')}>Done</Button>
                    </DialogActions>
                </Dialog>
            )}

            <Dialog
                open={createOpen}
                onClose={() => {
                    if (!pending.current) setCreateOpen(false)
                }}
                fullWidth
                maxWidth="sm"
                aria-labelledby="create-seat-title"
            >
                <DialogTitle id="create-seat-title">Create user seat</DialogTitle>
                <DialogContent>
                    <Box
                        component="form"
                        id="create-seat-form"
                        onSubmit={(event) => {
                            event.preventDefault()
                            void createSeat()
                        }}
                    >
                        <Stack
                            spacing={2}
                            sx={{ pt: 1 }}
                        >
                            {error?.target === 'create' && <Alert severity="error">{error.message}</Alert>}
                            <Typography variant="body2">
                                Create the seat first, then send an invitation from the user list.
                            </Typography>
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
                                control={
                                    <Checkbox
                                        checked={isAdmin}
                                        onChange={(event) => setIsAdmin(event.target.checked)}
                                    />
                                }
                                label="Organization administrator"
                            />
                        </Stack>
                    </Box>
                </DialogContent>
                <DialogActions>
                    <Button
                        disabled={busy}
                        onClick={() => setCreateOpen(false)}
                    >
                        Cancel
                    </Button>
                    <Button
                        variant="contained"
                        type="submit"
                        form="create-seat-form"
                        disabled={busy || atSeatLimit || !org.data || !name.trim() || !email.trim()}
                    >
                        Create seat
                    </Button>
                </DialogActions>
            </Dialog>

            <RoundedContainer title="Organization users">
                <Stack spacing={1.5}>
                    <Button
                        variant="contained"
                        sx={{ alignSelf: 'flex-start' }}
                        aria-describedby={atSeatLimit ? 'seat-limit-explanation' : undefined}
                        disabled={!org.data || atSeatLimit || busy}
                        onClick={() => {
                            clearError()
                            setCreateOpen(true)
                        }}
                    >
                        Create user seat
                    </Button>
                    {atSeatLimit && (
                        <Typography
                            id="seat-limit-explanation"
                            variant="body2"
                            color="text.secondary"
                        >
                            All {org.data?.seatLimit} seats are in use. Contact Ombuddi to add more seats.
                        </Typography>
                    )}
                    {busy && (
                        <Typography
                            role="status"
                            variant="body2"
                        >
                            Updating users…
                        </Typography>
                    )}
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
                                {error?.target === user.id && <Alert severity="error">{error.message}</Alert>}
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
                                <Button onClick={() => setHistorySeat(user)}>Email history</Button>
                                {!user.isLinked &&
                                    user.isActive &&
                                    (editingEmailFor === user.id ? (
                                        <>
                                            <Button
                                                variant="contained"
                                                onClick={saveSeatEmail}
                                                disabled={busy || !editingEmail.trim()}
                                            >
                                                Save email
                                            </Button>
                                            <Button
                                                onClick={() => setEditingEmailFor(null)}
                                                disabled={busy}
                                            >
                                                Cancel
                                            </Button>
                                        </>
                                    ) : (
                                        <>
                                            <Button
                                                variant="text"
                                                onClick={() => beginEmailEdit(user)}
                                                disabled={busy}
                                            >
                                                Edit email
                                            </Button>
                                            <Button
                                                variant="outlined"
                                                onClick={() => invite(user.id)}
                                                disabled={busy || !user.email}
                                            >
                                                {user.invitation?.isActive ? 'Replace invitation' : 'Create invitation'}
                                            </Button>
                                            {user.invitation?.isActive && (
                                                <Button
                                                    color="warning"
                                                    onClick={() => cancelInvitation(user.id)}
                                                    disabled={busy}
                                                >
                                                    Cancel invitation
                                                </Button>
                                            )}
                                        </>
                                    ))}
                                <Button
                                    disabled={busy}
                                    variant={user.isActive ? 'text' : 'outlined'}
                                    color={user.isActive ? 'error' : 'primary'}
                                    onClick={() => {
                                        setStatusTarget(user)
                                        setStatusReason('')
                                        clearError()
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
                aria-labelledby="user-status-title"
                open={statusTarget !== null}
                onClose={() => !pending.current && setStatusTarget(null)}
                fullWidth
                maxWidth="sm"
            >
                <DialogTitle id="user-status-title">
                    {statusTarget?.isActive ? 'Deactivate user' : 'Reactivate user'}
                </DialogTitle>
                <DialogContent>
                    <Stack
                        spacing={2}
                        sx={{ pt: 1 }}
                    >
                        {error?.target === statusTarget?.id && error && <Alert severity="error">{error.message}</Alert>}
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
                    <Button
                        onClick={() => setStatusTarget(null)}
                        disabled={busy}
                    >
                        Cancel
                    </Button>
                    <Button
                        onClick={changeStatus}
                        disabled={busy}
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
