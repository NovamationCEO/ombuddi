import { InvitationDelivery, invitationSeverity, type EmailDelivery } from '../components/InvitationDelivery'
import React from 'react'
import { useSnack } from '../libraries/useSnack'
import { useSearchParams } from 'react-router-dom'
import { SystemOrganizationAudit } from '../components/SystemOrganizationAudit'
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
    Tabs,
    Tab,
    Stack,
    TextField,
    Typography,
} from '@mui/material'
import { creator } from '../tools/db_tools/creator'
import { updater } from '../tools/db_tools/updater'
import { useGetter } from '../tools/db_tools/useGetter'
import { RoundedContainer } from '../components/RoundedContainer'
import { SystemOrganizationSeats } from '../components/SystemOrganizationSeats'

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
    emailDelivery?: EmailDelivery
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

    const [inviteDelivery, setInviteDelivery] = React.useState<EmailDelivery>()
    const [orgName, setOrgName] = React.useState('')
    const [adminName, setAdminName] = React.useState('')
    const [adminEmail, setAdminEmail] = React.useState('')
    const [tier, setTier] = React.useState('alpha')
    const [seatLimit, setSeatLimit] = React.useState('25')
    const [creating, setCreating] = React.useState(false)
    const [createError, setCreateError] = React.useState('')
    const [newInviteUrl, setNewInviteUrl] = React.useState('')

    const [editing, setEditing] = React.useState<EditingOrg | null>(null)
    const [saving, setSaving] = React.useState(false)
    const setSnack = useSnack((state) => state.setSnack)
    const [editError, setEditError] = React.useState('')
    const [statusTarget, setStatusTarget] = React.useState<SystemOrg | null>(null)
    const [statusReason, setStatusReason] = React.useState('')
    const [statusSaving, setStatusSaving] = React.useState(false)
    const [statusError, setStatusError] = React.useState('')
    const [searchParams, setSearchParams] = useSearchParams()
    const organizationId = searchParams.get('org')
    const managedOrganization = orgs.data?.find((org) => org.id === organizationId)
    const selectedTab = ['users', 'settings', 'audit'].includes(searchParams.get('tab') ?? '')
        ? searchParams.get('tab')!
        : 'users'
    const [createOpen, setCreateOpen] = React.useState(false)
    const heading = React.useRef<HTMLHeadingElement>(null)
    React.useEffect(() => {
        heading.current?.focus()
        heading.current?.scrollIntoView?.({ block: 'start' })
        setEditError('')
    }, [organizationId])
    React.useEffect(() => {
        if (!managedOrganization) return
        setEditing((current) =>
            current?.id === managedOrganization.id
                ? current
                : {
                      id: managedOrganization.id,
                      name: managedOrganization.name,
                      subscriptionTier: managedOrganization.subscriptionTier,
                      seatLimit: String(managedOrganization.seatLimit),
                  },
        )
    }, [managedOrganization])
    const isDirty =
        !!editing &&
        !!managedOrganization &&
        (editing.name !== managedOrganization.name ||
            editing.subscriptionTier !== managedOrganization.subscriptionTier ||
            Number(editing.seatLimit) !== managedOrganization.seatLimit)
    function openOrganization(org: SystemOrg, tab = 'users', replace = false) {
        setSearchParams(
            (current) => {
                const next = new URLSearchParams(current)
                next.set('org', org.id)
                next.set('tab', tab)
                return next
            },
            { replace },
        )
    }
    function backToOrganizations() {
        setSearchParams((current) => {
            const next = new URLSearchParams(current)
            next.delete('org')
            next.delete('tab')
            return next
        })
    }
    function closeCreate() {
        if (!creationPending.current) setCreateOpen(false)
    }

    const creationPending = React.useRef(false)
    const savePending = React.useRef(false)
    const statusPending = React.useRef(false)

    async function createOrg() {
        if (creationPending.current) return
        creationPending.current = true
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
            setInviteDelivery(result.emailDelivery)
            setOrgName('')
            setAdminName('')
            setAdminEmail('')
            setTier('alpha')
            setSeatLimit('25')
            await orgs.refetch()
        } catch (reason) {
            setCreateError(reason instanceof Error ? reason.message : 'Unable to create organization')
        } finally {
            creationPending.current = false
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
        if (!editing || savePending.current) return
        savePending.current = true
        setSaving(true)
        setEditError('')
        try {
            await updater(`system/organizations/${editing.id}`, {
                name: editing.name,
                subscriptionTier: editing.subscriptionTier,
                seatLimit: parseInt(editing.seatLimit, 10),
            })
            setSnack({ message: 'Organization settings saved.', severity: 'success' })
            await orgs.refetch()
        } catch (reason) {
            const message = reason instanceof Error ? reason.message : 'Unable to save changes'
            setEditError(message)
            setSnack({ message, severity: 'error' })
        } finally {
            savePending.current = false
            setSaving(false)
        }
    }

    async function copyInvite() {
        try {
            await navigator.clipboard.writeText(newInviteUrl)
            setSnack({ message: 'Invitation link copied.', severity: 'success' })
        } catch {
            setCreateError('Unable to copy automatically. Select and copy the invitation link.')
        }
    }

    async function changeStatus() {
        if (!statusTarget || statusPending.current) return
        statusPending.current = true
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
            statusPending.current = false
            setStatusSaving(false)
        }
    }

    return (
        <Stack
            spacing={2}
            sx={{ p: 1 }}
        >
            <Typography
                ref={heading}
                tabIndex={-1}
                component="h1"
                variant="h5"
                sx={{ '&:focus-visible': { outline: '2px solid', outlineColor: 'primary.main', outlineOffset: 4 } }}
            >
                {managedOrganization ? managedOrganization.name : 'System Administration'}
            </Typography>
            {orgs.error && (
                <Alert severity="error">Unable to load organizations. System administrator access is required.</Alert>
            )}
            {orgs.isLoading && <Typography>Loading organizations…</Typography>}
            {organizationId ? (
                <>
                    <Button
                        sx={{ alignSelf: 'flex-start' }}
                        onClick={backToOrganizations}
                    >
                        Back to organizations
                    </Button>
                    {!orgs.isLoading && !orgs.error && !managedOrganization && (
                        <Alert severity="warning">Organization not found.</Alert>
                    )}
                    {managedOrganization && (
                        <>
                            <Stack
                                direction="row"
                                spacing={1}
                            >
                                <Chip label={managedOrganization.isActive ? 'Active' : 'Deactivated'} />
                                <Typography>
                                    {managedOrganization.seatCount} active seats / {managedOrganization.seatLimit}
                                </Typography>
                            </Stack>
                            <Tabs
                                value={selectedTab}
                                onChange={(_, tab) => openOrganization(managedOrganization, tab, true)}
                                aria-label="Organization management"
                            >
                                {['users', 'settings', 'audit'].map((tab) => (
                                    <Tab
                                        key={tab}
                                        value={tab}
                                        label={tab === 'users' ? 'Users' : tab === 'settings' ? 'Settings' : 'Audit'}
                                        id={`org-tab-${tab}`}
                                        aria-controls={`org-panel-${tab}`}
                                    />
                                ))}
                            </Tabs>
                            <Box
                                tabIndex={0}
                                role="tabpanel"
                                id="org-panel-users"
                                aria-labelledby="org-tab-users"
                                hidden={selectedTab !== 'users'}
                            >
                                {/* Keep drafts and pending invitation results across tab switches. */}
                                <SystemOrganizationSeats
                                    key={managedOrganization.id}
                                    organization={managedOrganization}
                                    active={selectedTab === 'users'}
                                    onOrganizationChanged={orgs.refetch}
                                />
                            </Box>
                            <Box
                                tabIndex={0}
                                role="tabpanel"
                                id="org-panel-settings"
                                aria-labelledby="org-tab-settings"
                                hidden={selectedTab !== 'settings'}
                            >
                                {selectedTab === 'settings' && editing && (
                                    <Stack spacing={2}>
                                        {isDirty && <Alert severity="info">Unsaved changes.</Alert>}
                                        <Stack
                                            spacing={1.5}
                                            sx={{ p: 1.5, border: 1, borderColor: 'primary.main', borderRadius: 1 }}
                                        >
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
                                                    onChange={(e) =>
                                                        setEditing({ ...editing, subscriptionTier: e.target.value })
                                                    }
                                                    size="small"
                                                    sx={{ flex: 1 }}
                                                />
                                                <TextField
                                                    label="Seat limit"
                                                    type="number"
                                                    value={editing.seatLimit}
                                                    onChange={(e) =>
                                                        setEditing({ ...editing, seatLimit: e.target.value })
                                                    }
                                                    size="small"
                                                    slotProps={{ htmlInput: { min: 1 } }}
                                                    sx={{ width: 120 }}
                                                />
                                            </Box>
                                            {editError && <Alert severity="error">{editError}</Alert>}
                                            <Box sx={{ display: 'flex', gap: 1 }}>
                                                <Button
                                                    variant="contained"
                                                    size="small"
                                                    onClick={saveEdit}
                                                    disabled={saving}
                                                >
                                                    Save
                                                </Button>
                                                <Button
                                                    size="small"
                                                    disabled={saving}
                                                    onClick={() => startEdit(managedOrganization)}
                                                >
                                                    Reset
                                                </Button>
                                            </Box>
                                        </Stack>

                                        <Button
                                            color={managedOrganization.isActive ? 'error' : 'primary'}
                                            onClick={() => {
                                                setStatusTarget(managedOrganization)
                                                setStatusReason('')
                                                setStatusError('')
                                            }}
                                        >
                                            {managedOrganization.isActive
                                                ? 'Deactivate organization'
                                                : 'Reactivate organization'}
                                        </Button>
                                    </Stack>
                                )}
                            </Box>
                            <Box
                                tabIndex={0}
                                role="tabpanel"
                                id="org-panel-audit"
                                aria-labelledby="org-tab-audit"
                                hidden={selectedTab !== 'audit'}
                            >
                                {selectedTab === 'audit' && (
                                    <SystemOrganizationAudit organizationId={managedOrganization.id} />
                                )}
                            </Box>
                        </>
                    )}
                </>
            ) : (
                <>
                    <Button
                        variant="contained"
                        sx={{ alignSelf: 'flex-start' }}
                        onClick={() => {
                            setNewInviteUrl('')
                            setInviteDelivery(undefined)
                            setCreateError('')
                            setCreateOpen(true)
                        }}
                    >
                        Create organization
                    </Button>
                    <RoundedContainer title="All organizations">
                        <Stack spacing={1.5}>
                            {(orgs.data ?? []).map((org) => (
                                <Box
                                    key={org.id}
                                    sx={{ p: 1.5, border: 1, borderColor: 'divider', borderRadius: 1 }}
                                >
                                    <Stack
                                        direction={{ xs: 'column', sm: 'row' }}
                                        spacing={2}
                                        sx={{ justifyContent: 'space-between', alignItems: { sm: 'center' } }}
                                    >
                                        <Box>
                                            <Typography sx={{ fontWeight: 600 }}>{org.name}</Typography>
                                            <Typography variant="body2">
                                                {org.isActive ? 'Active' : 'Deactivated'} · {org.seatCount} active seats
                                                · limit {org.seatLimit}
                                            </Typography>
                                        </Box>
                                        <Button
                                            variant="outlined"
                                            onClick={() => openOrganization(org)}
                                        >
                                            Manage organization
                                        </Button>
                                    </Stack>
                                </Box>
                            ))}
                            {!orgs.isLoading && !orgs.error && orgs.data?.length === 0 && (
                                <Typography>No organizations yet.</Typography>
                            )}
                        </Stack>
                    </RoundedContainer>
                </>
            )}
            <Dialog
                open={createOpen}
                onClose={() => {
                    if (!newInviteUrl) closeCreate()
                }}
                fullWidth
                maxWidth="sm"
                aria-labelledby="create-organization-title"
            >
                <DialogTitle id="create-organization-title">
                    {newInviteUrl ? 'Organization created' : 'Create organization'}
                </DialogTitle>
                <DialogContent>
                    {newInviteUrl && createError && <Alert severity="error">{createError}</Alert>}
                    {newInviteUrl ? (
                        <Box sx={{ pt: 1 }}>
                            {newInviteUrl && (
                                <Alert severity={invitationSeverity(inviteDelivery)}>
                                    <Stack spacing={1}>
                                        <InvitationDelivery delivery={inviteDelivery} />
                                        <TextField
                                            label="Invitation link"
                                            value={newInviteUrl}
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
                            )}
                        </Box>
                    ) : (
                        <Box
                            component="form"
                            onSubmit={(event) => {
                                event.preventDefault()
                                void createOrg()
                            }}
                            sx={{ pt: 1 }}
                        >
                            <Stack spacing={2}>
                                <Typography
                                    variant="body2"
                                    color="text.secondary"
                                >
                                    Creates the organization and a first administrator seat in one step. An invitation
                                    will be created for the first administrator.
                                </Typography>
                                <Divider />
                                <TextField
                                    autoFocus
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
                                    helperText="The administrator must sign in with this email address."
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
                                    type="submit"
                                    disabled={creating || !orgName.trim() || !adminName.trim() || !adminEmail.trim()}
                                >
                                    Create organization
                                </Button>
                            </Stack>
                        </Box>
                    )}
                </DialogContent>
                <DialogActions>
                    <Button
                        onClick={closeCreate}
                        disabled={creating}
                    >
                        {newInviteUrl ? 'Done' : 'Cancel'}
                    </Button>
                </DialogActions>
            </Dialog>
            <Dialog
                aria-labelledby="organization-status-title"
                open={statusTarget !== null && statusTarget.id === organizationId && selectedTab === 'settings'}
                onClose={() => !statusSaving && setStatusTarget(null)}
                fullWidth
                maxWidth="sm"
            >
                <DialogTitle id="organization-status-title">
                    {statusTarget?.isActive ? 'Deactivate organization' : 'Reactivate organization'}
                </DialogTitle>
                <DialogContent>
                    <Stack
                        spacing={2}
                        sx={{ pt: 1 }}
                    >
                        {statusError && <Alert severity="error">{statusError}</Alert>}
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
                    <Button
                        onClick={() => setStatusTarget(null)}
                        disabled={statusSaving}
                    >
                        Cancel
                    </Button>
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
