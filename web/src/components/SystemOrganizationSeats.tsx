import { InvitationEmailHistory } from './InvitationEmailHistory'
import { InvitationDelivery, invitationSeverity, type EmailDelivery } from './InvitationDelivery'
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
    FormControlLabel,
    Stack,
    TextField,
    Typography,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
} from '@mui/material'
import { creator } from '../tools/db_tools/creator'
import { updater } from '../tools/db_tools/updater'
import { useGetter } from '../tools/db_tools/useGetter'
import { RoundedContainer } from './RoundedContainer'

type SystemOrgSummary = {
    id: string
    name: string
    seatLimit: number
    seatCount: number
    isActive: boolean
}

type InvitationSummary = {
    id: string
    createdAt: string
    expiresAt: string
    claimedAt: string | null
    revokedAt: string | null
    isActive: boolean
}

type SystemSeat = {
    id: string
    name: string
    email: string | null
    isAdmin: boolean
    isSystemAdmin: boolean
    isLinked: boolean
    isActive: boolean
    deactivatedAt: string | null
    invitation: InvitationSummary | null
}

type InvitationHistory = {
    id: string
    invitedEmail: string
    createdAt: string
    expiresAt: string
    claimedAt: string | null
    claimedByEmail: string | null
    revokedAt: string | null
    isActive: boolean
    createdBy: { id: string; name: string; email: string | null }
}

type InvitationResult = {
    emailDelivery?: EmailDelivery
    inviteUrl?: string
    expiresAt?: string
}

function invitationStatus(invitation: InvitationHistory) {
    if (invitation.claimedAt) return 'Claimed'
    if (invitation.revokedAt) return 'Cancelled'
    if (invitation.isActive) return 'Active'
    return 'Expired'
}

export function SystemOrganizationSeats({
    organization,
    onOrganizationChanged,
    active = true,
}: {
    active?: boolean
    organization: SystemOrgSummary
    onOrganizationChanged: () => Promise<unknown>
}) {
    const seats = useGetter<SystemSeat[]>(['system', 'organizations', organization.id, 'ombuds'])
    const [inviteDelivery, setInviteDelivery] = React.useState<EmailDelivery>()
    const [historySeat, setHistorySeat] = React.useState<SystemSeat | null>(null)
    const invitationHistory = useGetter<InvitationHistory[]>([
        'system',
        'organizations',
        organization.id,
        'ombuds',
        historySeat?.id,
        'invitations',
    ])
    const [name, setName] = React.useState('')
    const [email, setEmail] = React.useState('')
    const [isAdmin, setIsAdmin] = React.useState(true)
    const queryClient = useQueryClient()
    const [copyError, setCopyError] = React.useState('')
    const setSnack = useSnack((state) => state.setSnack)
    const [inviteUrl, setInviteUrl] = React.useState('')
    const [editingEmailFor, setEditingEmailFor] = React.useState<string | null>(null)
    const [editingEmail, setEditingEmail] = React.useState('')

    async function refresh() {
        await Promise.all([
            seats.refetch(),
            queryClient.invalidateQueries({
                queryKey: ['system', 'organizations', organization.id, 'audit'],
                exact: true,
            }),
            onOrganizationChanged(),
        ])
    }

    const { busy, error: actionError, run: runAction } = useAdminAction(refresh)
    const error = actionError?.message
    const errorSeatId = actionError?.target
    async function run(action: () => Promise<unknown>, fallback: string, seatId: string) {
        return runAction(
            async () => {
                setCopyError('')
                setInviteUrl('')
                await action()
            },
            fallback,
            seatId,
        )
    }

    async function createSeat() {
        await run(
            async () => {
                const result = await creator<InvitationResult>(`system/organizations/${organization.id}/ombuds`, {
                    name,
                    email,
                    isAdmin,
                    createInvitation: true,
                })
                setInviteUrl(result.inviteUrl ?? '')
                setInviteDelivery(result.emailDelivery)
                setName('')
                setEmail('')
                setIsAdmin(true)
            },
            'Unable to create user seat',
            'create',
        )
    }

    async function invite(seat: SystemSeat) {
        await run(
            async () => {
                const result = await creator<InvitationResult>(
                    `system/organizations/${organization.id}/ombuds/${seat.id}/invitation`,
                    {},
                )
                setInviteUrl(result.inviteUrl ?? '')
                setInviteDelivery(result.emailDelivery)
                await queryClient.invalidateQueries({
                    queryKey: ['system', 'organizations', organization.id, 'ombuds', seat.id, 'email-history'],
                    exact: true,
                })
            },
            'Unable to create invitation',
            seat.id,
        )
    }

    async function cancelInvitation(seat: SystemSeat) {
        await run(
            () => creator(`system/organizations/${organization.id}/ombuds/${seat.id}/invitation/cancel`, {}),
            'Unable to cancel invitation',
            seat.id,
        )
    }

    async function changeRole(seat: SystemSeat) {
        await run(
            () =>
                updater(`system/organizations/${organization.id}/ombuds/${seat.id}/role`, {
                    isAdmin: !seat.isAdmin,
                }),
            'Unable to update administrator role',
            seat.id,
        )
    }

    async function changeStatus(seat: SystemSeat) {
        await run(
            () =>
                updater(`system/organizations/${organization.id}/ombuds/${seat.id}/status`, {
                    active: !seat.isActive,
                }),
            'Unable to update seat status',
            seat.id,
        )
    }

    async function saveEmail(seat: SystemSeat) {
        const saved = await run(
            () =>
                updater(`system/organizations/${organization.id}/ombuds/${seat.id}`, {
                    email: editingEmail,
                }),
            'Unable to update email',
            seat.id,
        )
        if (saved) {
            setEditingEmailFor(null)
            setEditingEmail('')
        }
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

    return (
        <Stack spacing={2}>
            <Typography
                variant="body2"
                color="text.secondary"
            >
                System administrators can see seat identity and lifecycle information, but this view does not expose
                cases, visitors, notes, or other organization records.
            </Typography>
            <Dialog
                open={active && !!inviteUrl}
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

            <RoundedContainer title="Add and invite a user">
                {error && errorSeatId === 'create' && <Alert severity="error">{error}</Alert>}
                <Stack spacing={1.5}>
                    <TextField
                        label="User name"
                        value={name}
                        onChange={(event) => setName(event.target.value)}
                    />
                    <TextField
                        label="Email"
                        type="email"
                        value={email}
                        onChange={(event) => setEmail(event.target.value)}
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
                    <Typography
                        variant="caption"
                        color="text.secondary"
                    >
                        The seat is created and its seven-day invitation is issued in one step.
                    </Typography>
                    <Button
                        variant="contained"
                        onClick={createSeat}
                        disabled={
                            busy ||
                            !organization.isActive ||
                            !name.trim() ||
                            !email.trim() ||
                            organization.seatCount >= organization.seatLimit
                        }
                    >
                        Create seat and invitation
                    </Button>
                </Stack>
            </RoundedContainer>

            <RoundedContainer title={`Seats (${organization.seatCount} active / ${organization.seatLimit})`}>
                <Stack spacing={1.5}>
                    {(seats.data ?? []).map((seat) => (
                        <Box
                            key={seat.id}
                            sx={{ p: 1.5, border: 1, borderColor: 'divider', borderRadius: 1 }}
                        >
                            <Stack spacing={1}>
                                {error && errorSeatId === seat.id && <Alert severity="error">{error}</Alert>}
                                <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', flexWrap: 'wrap' }}>
                                    <Typography sx={{ fontWeight: 600 }}>{seat.name}</Typography>
                                    <Chip
                                        size="small"
                                        label={seat.isActive ? 'Active seat' : 'Deactivated seat'}
                                        color={seat.isActive ? 'success' : 'default'}
                                    />
                                    <Chip
                                        size="small"
                                        label={seat.isLinked ? 'Auth0 linked' : 'Awaiting account'}
                                        variant="outlined"
                                    />
                                    {seat.isAdmin && (
                                        <Chip
                                            size="small"
                                            label="Organization admin"
                                            color="primary"
                                            variant="outlined"
                                        />
                                    )}
                                    {seat.isSystemAdmin && (
                                        <Chip
                                            size="small"
                                            label="System admin"
                                            color="secondary"
                                            variant="outlined"
                                        />
                                    )}
                                </Box>
                                {editingEmailFor === seat.id ? (
                                    <Stack
                                        direction={{ xs: 'column', sm: 'row' }}
                                        spacing={1}
                                    >
                                        <TextField
                                            size="small"
                                            type="email"
                                            label="Recorded email"
                                            value={editingEmail}
                                            onChange={(event) => setEditingEmail(event.target.value)}
                                            sx={{ flex: 1 }}
                                        />
                                        <Button
                                            onClick={() => saveEmail(seat)}
                                            disabled={busy || !editingEmail.trim()}
                                        >
                                            Save
                                        </Button>
                                        <Button
                                            onClick={() => setEditingEmailFor(null)}
                                            disabled={busy}
                                        >
                                            Cancel
                                        </Button>
                                    </Stack>
                                ) : (
                                    <Typography variant="body2">{seat.email || 'No email recorded'}</Typography>
                                )}
                                {seat.isLinked && (
                                    <Typography
                                        variant="caption"
                                        color="text.secondary"
                                    >
                                        Updating the recorded email does not change or replace the linked Auth0
                                        identity.
                                    </Typography>
                                )}
                                {seat.invitation && (
                                    <Typography
                                        variant="caption"
                                        color="text.secondary"
                                    >
                                        Latest invitation:{' '}
                                        {seat.invitation.claimedAt
                                            ? 'claimed'
                                            : seat.invitation.revokedAt
                                              ? 'cancelled'
                                              : seat.invitation.isActive
                                                ? `active until ${new Date(seat.invitation.expiresAt).toLocaleString()}`
                                                : 'expired'}
                                    </Typography>
                                )}
                                <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                                    <Button
                                        size="small"
                                        onClick={() => {
                                            setEditingEmailFor(seat.id)
                                            setEditingEmail(seat.email ?? '')
                                        }}
                                        disabled={busy}
                                    >
                                        Edit email
                                    </Button>
                                    <Button
                                        size="small"
                                        onClick={() => changeRole(seat)}
                                        disabled={busy || seat.isSystemAdmin}
                                    >
                                        {seat.isAdmin ? 'Remove admin role' : 'Make organization admin'}
                                    </Button>
                                    {!seat.isLinked && seat.isActive && (
                                        <Button
                                            size="small"
                                            variant="outlined"
                                            onClick={() => invite(seat)}
                                            disabled={busy || !seat.email}
                                        >
                                            {seat.invitation?.isActive ? 'Replace invitation' : 'Create invitation'}
                                        </Button>
                                    )}
                                    {seat.invitation?.isActive && (
                                        <Button
                                            size="small"
                                            color="warning"
                                            onClick={() => cancelInvitation(seat)}
                                            disabled={busy}
                                        >
                                            Cancel invitation
                                        </Button>
                                    )}
                                    <Button
                                        size="small"
                                        onClick={() => setHistorySeat(seat)}
                                        disabled={busy}
                                    >
                                        Invitation history
                                    </Button>
                                    <Button
                                        size="small"
                                        color={seat.isActive ? 'error' : 'primary'}
                                        onClick={() => changeStatus(seat)}
                                        disabled={busy || seat.isSystemAdmin}
                                    >
                                        {seat.isActive ? 'Deactivate seat' : 'Reactivate seat'}
                                    </Button>
                                </Box>
                            </Stack>
                        </Box>
                    ))}
                    {!seats.isLoading && (seats.data?.length ?? 0) === 0 && (
                        <Typography color="text.secondary">No seats found.</Typography>
                    )}
                </Stack>
            </RoundedContainer>

            {historySeat && (
                <Dialog
                    open={active}
                    onClose={() => setHistorySeat(null)}
                    fullWidth
                    maxWidth="md"
                    aria-labelledby="invitation-history-title"
                >
                    <DialogTitle id="invitation-history-title">Invitation history — {historySeat.name}</DialogTitle>
                    <DialogContent>
                        <Stack spacing={1}>
                            <InvitationEmailHistory
                                key={historySeat.id}
                                endpoint={[
                                    'system',
                                    'organizations',
                                    organization.id,
                                    'ombuds',
                                    historySeat.id,
                                    'email-history',
                                ]}
                            />
                            {(invitationHistory.data ?? []).map((invitation) => (
                                <Box
                                    key={invitation.id}
                                    sx={{ p: 1, borderBottom: 1, borderColor: 'divider' }}
                                >
                                    <Typography
                                        variant="body2"
                                        sx={{ fontWeight: 600 }}
                                    >
                                        {invitationStatus(invitation)} · {invitation.invitedEmail}
                                    </Typography>
                                    <Typography
                                        variant="caption"
                                        color="text.secondary"
                                    >
                                        Created {new Date(invitation.createdAt).toLocaleString()} by{' '}
                                        {invitation.createdBy.name}
                                        {' · '}Expires {new Date(invitation.expiresAt).toLocaleString()}
                                        {invitation.claimedByEmail ? ` · Claimed by ${invitation.claimedByEmail}` : ''}
                                    </Typography>
                                </Box>
                            ))}
                            {!invitationHistory.isLoading && (invitationHistory.data?.length ?? 0) === 0 && (
                                <Typography color="text.secondary">No invitations have been issued.</Typography>
                            )}
                        </Stack>
                    </DialogContent>
                    <DialogActions>
                        <Button onClick={() => setHistorySeat(null)}>Close history</Button>
                    </DialogActions>
                </Dialog>
            )}
        </Stack>
    )
}
