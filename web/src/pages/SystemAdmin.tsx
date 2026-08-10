import React from 'react'
import {
    Alert,
    Box,
    Button,
    Chip,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    Divider,
    Stack,
    TextField,
    Typography,
} from '@mui/material'
import { creator } from '../tools/db_tools/creator'
import { updater } from '../tools/db_tools/updater'
import { useGetter } from '../tools/db_tools/useGetter'
import { RoundedContainer } from '../components/RoundedContainer'

type SystemOrg = {
    id: string
    name: string
    subscriptionTier: string
    seatLimit: number
    seatCount: number
    totalSeatCount: number
    linkedCount: number
    isActive: boolean
    deactivatedAt: string | null
}

type CreateOrgResult = {
    organizationId: string
    inviteUrl: string
    expiresAt: string
}

type EditingOrg = {
    id: string
    name: string
    subscriptionTier: string
    seatLimit: string
}


export function SystemAdmin() {
    const orgs = useGetter<SystemOrg[]>(['system', 'organizations'])

    const [orgName, setOrgName] = React.useState('')
    const [adminName, setAdminName] = React.useState('')
    const [adminEmail, setAdminEmail] = React.useState('')
    const [tier, setTier] = React.useState('alpha')
    const [seatLimit, setSeatLimit] = React.useState('10')
    const [creating, setCreating] = React.useState(false)
    const [createError, setCreateError] = React.useState('')
    const [newInviteUrl, setNewInviteUrl] = React.useState('')

    const [editing, setEditing] = React.useState<EditingOrg | null>(null)
    const [saving, setSaving] = React.useState(false)
    const [editError, setEditError] = React.useState('')
    const [statusTarget, setStatusTarget] = React.useState<SystemOrg | null>(null)
    const [statusReason, setStatusReason] = React.useState('')
    const [statusSaving, setStatusSaving] = React.useState(false)
    const [statusError, setStatusError] = React.useState('')

    async function createOrg() {
        setCreating(true)
        setCreateError('')
        setNewInviteUrl('')
        try {
            const result = await creator<CreateOrgResult>('system/organizations', {
                name: orgName,
                adminName,
                adminEmail,
                subscriptionTier: tier,
                seatLimit: parseInt(seatLimit, 10),
            })
            setNewInviteUrl(result.inviteUrl)
            setOrgName('')
            setAdminName('')
            setAdminEmail('')
            setTier('alpha')
            setSeatLimit('10')
            await orgs.refetch()
        } catch (reason) {
            setCreateError(reason instanceof Error ? reason.message : 'Unable to create organization')
        } finally {
            setCreating(false)
        }
    }

    function startEdit(org: SystemOrg) {
        setEditing({
            id: org.id,
            name: org.name,
            subscriptionTier: org.subscriptionTier,
            seatLimit: String(org.seatLimit),
        })
        setEditError('')
    }

    async function saveEdit() {
        if (!editing) return
        setSaving(true)
        setEditError('')
        try {
            await updater(`system/organizations/${editing.id}`, {
                name: editing.name,
                subscriptionTier: editing.subscriptionTier,
                seatLimit: parseInt(editing.seatLimit, 10),
            })
            setEditing(null)
            await orgs.refetch()
        } catch (reason) {
            setEditError(reason instanceof Error ? reason.message : 'Unable to save changes')
        } finally {
            setSaving(false)
        }
    }

    async function copyInvite() {
        await navigator.clipboard.writeText(newInviteUrl)
    }

    async function changeStatus() {
        if (!statusTarget) return
        setStatusSaving(true)
        setStatusError('')
        try {
            await updater(`system/organizations/${statusTarget.id}/status`, {
                active: !statusTarget.isActive,
                reason: statusReason,
            })
            setStatusTarget(null)
            setStatusReason('')
            await orgs.refetch()
        } catch (reason) {
            setStatusError(reason instanceof Error ? reason.message : 'Unable to update organization status')
        } finally {
            setStatusSaving(false)
        }
    }

    return (
        <Stack spacing={2} sx={{ p: 1 }}>
            <Typography variant="h5">System Administration</Typography>

            {orgs.error && (
                <Alert severity="error">
                    Unable to load organizations. Ombuddi system administrator access is required.
                </Alert>
            )}
            {statusError && <Alert severity="error">{statusError}</Alert>}

            {newInviteUrl && (
                <Alert severity="success">
                    <Stack spacing={1}>
                        <Box>Organization created. Share this invitation with the first administrator — it is shown only once.</Box>
                        <TextField
                            value={newInviteUrl}
                            fullWidth
                            slotProps={{ input: { readOnly: true } }}
                        />
                        <Button onClick={copyInvite} variant="outlined">Copy invitation link</Button>
                    </Stack>
                </Alert>
            )}

            <RoundedContainer title="Create organization">
                <Stack spacing={2}>
                    <Typography variant="body2" color="text.secondary">
                        Creates the organization and a first administrator seat in one step.
                        The invitation link replaces the manual Auth0 metadata process.
                    </Typography>
                    <Divider />
                    <TextField
                        label="Organization name"
                        value={orgName}
                        onChange={(e) => setOrgName(e.target.value)}
                        required
                    />
                    <TextField
                        label="First administrator name"
                        value={adminName}
                        onChange={(e) => setAdminName(e.target.value)}
                        required
                    />
                        <TextField
                            label="First administrator email"
                            type="email"
                            value={adminEmail}
                            onChange={(e) => setAdminEmail(e.target.value)}
                            required
                            helperText="The invitation is bound to this verified Auth0 email."
                    />
                    <Box sx={{ display: 'flex', gap: 2 }}>
                        <TextField
                            label="Subscription tier"
                            value={tier}
                            onChange={(e) => setTier(e.target.value)}
                            sx={{ flex: 1 }}
                        />
                        <TextField
                            label="Seat limit"
                            type="number"
                            value={seatLimit}
                            onChange={(e) => setSeatLimit(e.target.value)}
                            slotProps={{ htmlInput: { min: 1 } }}
                            sx={{ width: 130 }}
                        />
                    </Box>
                    {createError && <Alert severity="error">{createError}</Alert>}
                    <Button
                        variant="contained"
                        onClick={createOrg}
                        disabled={creating || !orgName.trim() || !adminName.trim() || !adminEmail.trim()}
                    >
                        Create organization
                    </Button>
                </Stack>
            </RoundedContainer>

            <RoundedContainer title="All organizations">
                <Stack spacing={1.5}>
                    {(orgs.data ?? []).map((org) => (
                        <Box key={org.id}>
                            {editing?.id === org.id ? (
                                <Stack spacing={1.5} sx={{ p: 1.5, border: 1, borderColor: 'primary.main', borderRadius: 1 }}>
                                    <TextField
                                        label="Name"
                                        value={editing.name}
                                        onChange={(e) => setEditing({ ...editing, name: e.target.value })}
                                        size="small"
                                    />
                                    <Box sx={{ display: 'flex', gap: 1.5 }}>
                                        <TextField
                                            label="Tier"
                                            value={editing.subscriptionTier}
                                            onChange={(e) => setEditing({ ...editing, subscriptionTier: e.target.value })}
                                            size="small"
                                            sx={{ flex: 1 }}
                                        />
                                        <TextField
                                            label="Seat limit"
                                            type="number"
                                            value={editing.seatLimit}
                                            onChange={(e) => setEditing({ ...editing, seatLimit: e.target.value })}
                                            size="small"
                                            slotProps={{ htmlInput: { min: 1 } }}
                                            sx={{ width: 120 }}
                                        />
                                    </Box>
                                    {editError && <Alert severity="error">{editError}</Alert>}
                                    <Box sx={{ display: 'flex', gap: 1 }}>
                                        <Button variant="contained" size="small" onClick={saveEdit} disabled={saving}>
                                            Save
                                        </Button>
                                        <Button size="small" onClick={() => setEditing(null)}>
                                            Cancel
                                        </Button>
                                    </Box>
                                </Stack>
                            ) : (
                                <Box sx={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'space-between',
                                    p: 1.5,
                                    border: 1,
                                    borderColor: 'divider',
                                    borderRadius: 1,
                                    gap: 2,
                                }}>
                                    <Box sx={{ minWidth: 0 }}>
                                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
                                            <Typography sx={{ fontWeight: 600 }}>{org.name}</Typography>
                                            <Chip label={org.subscriptionTier} size="small" variant="outlined" sx={{ textTransform: 'capitalize' }} />
                                            <Chip
                                                label={org.isActive ? 'Active' : 'Deactivated'}
                                                size="small"
                                                color={org.isActive ? 'success' : 'default'}
                                                variant={org.isActive ? 'outlined' : 'filled'}
                                            />
                                        </Box>
                                        <Typography variant="caption" color="text.secondary">
                                            {org.linkedCount} linked · {org.seatCount} active seats
                                            {org.totalSeatCount !== org.seatCount ? ` · ${org.totalSeatCount} total` : ''}
                                            {' · '}limit {org.seatLimit}
                                        </Typography>
                                    </Box>
                                    <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                                        <Button variant="outlined" size="small" onClick={() => startEdit(org)}>
                                            Edit
                                        </Button>
                                        <Button
                                            variant={org.isActive ? 'text' : 'outlined'}
                                            color={org.isActive ? 'error' : 'primary'}
                                            size="small"
                                            onClick={() => {
                                                setStatusTarget(org)
                                                setStatusReason('')
                                                setStatusError('')
                                            }}
                                        >
                                            {org.isActive ? 'Deactivate' : 'Reactivate'}
                                        </Button>
                                    </Box>
                                </Box>
                            )}
                        </Box>
                    ))}
                    {!orgs.isLoading && (orgs.data?.length ?? 0) === 0 && (
                        <Typography color="text.secondary">No organizations yet.</Typography>
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
                    {statusTarget?.isActive ? 'Deactivate organization' : 'Reactivate organization'}
                </DialogTitle>
                <DialogContent>
                    <Stack spacing={2} sx={{ pt: 1 }}>
                        <Typography>
                            {statusTarget?.isActive
                                ? `New requests from everyone in ${statusTarget.name} will be blocked immediately, and unused invitations will be revoked. No records will be deleted.`
                                : `${statusTarget?.name} will regain access. Users who were individually deactivated will remain deactivated.`}
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
                        {statusTarget?.isActive ? 'Deactivate organization' : 'Reactivate organization'}
                    </Button>
                </DialogActions>
            </Dialog>
        </Stack>
    )
}
