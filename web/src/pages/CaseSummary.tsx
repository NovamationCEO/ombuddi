import {
    Add,
    ArrowBack,
    CalendarMonthOutlined,
    EditOutlined,
    LockOutlined,
    ScheduleOutlined,
} from '@mui/icons-material'
import {
    Box,
    Alert,
    Button,
    ButtonBase,
    Chip,
    CircularProgress,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    Divider,
    MenuItem,
    Paper,
    Stack,
    TextField,
    Typography,
} from '@mui/material'
import React from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { CodeChip } from '../components/CodeChip'
import { EditCodeDialog } from '../components/EditCodeDialog'
import { ReferralSourceSelector } from '../components/ReferralSourceSelector'
import { ProtectedText } from '../components/ProtectedText'
import { useSnack } from '../libraries/useSnack'
import { useGetter } from '../tools/db_tools/useGetter'
import { updater } from '../tools/db_tools/updater'
import { encryptProtectedText, isEncrypted } from '../tools/notesCrypto'
import { referralSelectionsAreValid } from '../tools/referralSources'
import { CaseReferralSourceType, CaseType, EntryType, PersonType, ReferralSourceSelectionType } from '../types/majorTypes'
import { usePhraseSelection } from '../tools/phraseSource'
import { PhraseSourceControl } from '../components/PhraseSourceControl'

const workspace = {
    background: 'var(--mui-palette-background-default)',
    paper: 'var(--mui-palette-background-paper)',
    raised: 'var(--mui-palette-app-surfaceRaised)',
    ink: 'var(--mui-palette-text-primary)',
    muted: 'var(--mui-palette-text-secondary)',
    teal: 'var(--mui-palette-secondary-main)',
    tealDark: 'var(--mui-palette-secondary-dark)',
    tealPale: 'var(--mui-palette-app-surfaceTint)',
    border: 'var(--mui-palette-divider)',
    purple: 'var(--mui-palette-primary-main)',
} as const

const statusStyles = {
    active: {
        label: 'Active',
        color: 'var(--mui-palette-secondary-main)',
        background: 'rgba(var(--mui-palette-secondary-mainChannel) / 0.14)',
        border: 'rgba(var(--mui-palette-secondary-mainChannel) / 0.42)',
    },
    monitoring: {
        label: 'Monitoring',
        color: 'var(--mui-palette-warning-main)',
        background: 'rgba(var(--mui-palette-warning-mainChannel) / 0.14)',
        border: 'rgba(var(--mui-palette-warning-mainChannel) / 0.4)',
    },
    closed: {
        label: 'Closed',
        color: 'var(--mui-palette-text-secondary)',
        background: 'var(--mui-palette-action-hover)',
        border: 'var(--mui-palette-divider)',
    },
} as const

function personLabel(person: PersonType): string {
    if (person.isPublic && person.publicName) return person.publicName
    const parts = [person.primaryRole, person.generation, person.gender].filter(
        (value) => value && value !== 'unknown' && value !== 'N/A',
    )
    return parts.length > 0 ? parts.join(' · ') : 'Unspecified'
}

function formatDate(value?: Date) {
    if (!value) return '—'
    return new Date(value).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
}

function formatMinutes(minutes?: number) {
    if (minutes === undefined || minutes === null) return '—'
    const hours = Math.floor(minutes / 60)
    const remainingMinutes = minutes % 60
    if (!hours) return `${remainingMinutes} min`
    if (!remainingMinutes) return `${hours} hr`
    return `${hours} hr ${remainingMinutes} min`
}

export function CaseSummary() {
    const { caseId } = useParams()
    const navigate = useNavigate()
    const caseRes = useGetter<CaseType>(['get_case_by_id', caseId])
    const entriesRes = useGetter<EntryType[]>(['get_entries_by_case_id', caseId])
    const referralSourcesRes = useGetter<CaseReferralSourceType[]>(['get_case_referral_sources', caseId])
    const setSnack = useSnack((state) => state.setSnack)

    const [highlightedId, setHighlightedId] = React.useState<string | null>(null)
    const [showEditCodes, setShowEditCodes] = React.useState(false)
    const [editing, setEditing] = React.useState(false)
    const [saving, setSaving] = React.useState(false)
    const [editName, setEditName] = React.useState('')
    const [editDescription, setEditDescription] = React.useState('')
    const [decryptedDescription, setDecryptedDescription] = React.useState<string | null>(null)
    const editDescriptionPhrase = usePhraseSelection()
    const [editStatus, setEditStatus] = React.useState('')
    const [editingReferrals, setEditingReferrals] = React.useState(false)
    const [savingReferrals, setSavingReferrals] = React.useState(false)
    const [showReferralErrors, setShowReferralErrors] = React.useState(false)
    const [editReferralSources, setEditReferralSources] = React.useState<ReferralSourceSelectionType[]>([])

    const sortedEntries = React.useMemo(
        () =>
            [...(entriesRes.data ?? [])].sort(
                (first, second) => new Date(second.date).getTime() - new Date(first.date).getTime(),
            ),
        [entriesRes.data],
    )

    React.useEffect(() => {
        if (!sortedEntries.length) {
            setHighlightedId(null)
            return
        }
        if (!highlightedId || !sortedEntries.some((entry) => entry.id === highlightedId)) {
            setHighlightedId(sortedEntries[0].id)
        }
    }, [highlightedId, sortedEntries])

    const highlightedEntry = React.useMemo(
        () => sortedEntries.find((entry) => entry.id === highlightedId) ?? null,
        [highlightedId, sortedEntries],
    )
    const highlightedPeopleRes = useGetter<PersonType[]>(['get_persons_by_entry_id', highlightedId ?? undefined])
    const organizationId = caseRes.data?.organizationId ?? ''
    const rawDescription = caseRes.data?.description ?? ''
    const descriptionLocked = isEncrypted(rawDescription) && decryptedDescription === null

    React.useEffect(() => {
        setDecryptedDescription(isEncrypted(rawDescription) ? null : rawDescription)
    }, [rawDescription])

    const rememberDescription = React.useCallback((plaintext: string) => {
        setDecryptedDescription(plaintext)
    }, [])

    function openEdit() {
        setEditName(caseRes.data?.name ?? '')
        setEditDescription(decryptedDescription ?? '')
        setEditStatus(caseRes.data?.status ?? 'active')
        setEditing(true)
    }

    async function saveEdit() {
        if (!descriptionLocked && editDescription && editDescriptionPhrase.phrase === null) {
            setSnack({
                message: 'Choose Blank, set the Default Salt, or provide free text for the case description.',
                severity: 'error',
            })
            return
        }
        setSaving(true)
        try {
            const storedDescription = descriptionLocked
                ? rawDescription
                : editDescription
                    ? await encryptProtectedText(editDescription, editDescriptionPhrase.phrase ?? '', organizationId)
                    : ''
            await updater('update_case', {
                id: caseId,
                name: editName,
                description: storedDescription,
                status: editStatus,
            })
            await caseRes.refetch()
            setEditing(false)
        } finally {
            setSaving(false)
        }
    }

    function openReferralEditor() {
        setEditReferralSources((referralSourcesRes.data ?? []).map((source) => ({
            id: source.id,
            behavior: source.behavior,
            ...(source.detail ? { detail: source.detail } : {}),
        })))
        setShowReferralErrors(false)
        setEditingReferrals(true)
    }

    async function saveReferralSources() {
        if (!referralSelectionsAreValid(editReferralSources)) {
            setShowReferralErrors(true)
            return
        }

        setSavingReferrals(true)
        try {
            await updater('update_case_referral_sources', {
                caseId,
                referralSources: editReferralSources.map((selection) => ({
                    id: selection.id,
                    ...(selection.detail !== undefined ? { detail: selection.detail.trim() } : {}),
                })),
            })
            await referralSourcesRes.refetch()
            setEditingReferrals(false)
            setSnack({ message: 'Referral sources saved.', severity: 'success' })
        } catch (error) {
            setSnack({
                message: error instanceof Error ? error.message : 'Unable to save referral sources.',
                severity: 'error',
            })
        } finally {
            setSavingReferrals(false)
        }
    }

    if (caseRes.isLoading) {
        return (
            <Box sx={{ minHeight: '100%', display: 'grid', placeItems: 'center', bgcolor: workspace.background }}>
                <CircularProgress sx={{ color: workspace.teal }} />
            </Box>
        )
    }

    const caseItem = caseRes.data
    if (!caseItem) {
        return (
            <Box sx={{ minHeight: '100%', p: 4, bgcolor: workspace.background, color: workspace.ink }}>
                <Typography variant="h5">Case not found</Typography>
                <Button
                    startIcon={<ArrowBack />}
                    onClick={() => navigate('/cases')}
                    sx={{ mt: 2, color: workspace.teal }}
                >
                    Return to cases
                </Button>
            </Box>
        )
    }

    const normalizedStatus = caseItem.status?.toLowerCase() as keyof typeof statusStyles
    const status = statusStyles[normalizedStatus] ?? statusStyles.active

    return (
        <Box
            sx={{
                minHeight: '100%',
                boxSizing: 'border-box',
                bgcolor: workspace.background,
                color: workspace.ink,
            }}
        >
            <EditCodeDialog
                open={showEditCodes}
                onClose={() => {
                    setShowEditCodes(false)
                    caseRes.refetch()
                }}
            />

            <Dialog
                open={editingReferrals}
                onClose={() => !savingReferrals && setEditingReferrals(false)}
                maxWidth="sm"
                fullWidth
            >
                <DialogTitle>Edit referral sources</DialogTitle>
                <DialogContent>
                    <Box sx={{ pt: 0.5 }}>
                        <ReferralSourceSelector
                            value={editReferralSources}
                            onChange={(value) => {
                                setEditReferralSources(value)
                                setShowReferralErrors(false)
                            }}
                            retainedSources={referralSourcesRes.data ?? []}
                            disabled={savingReferrals}
                            showErrors={showReferralErrors}
                        />
                    </Box>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setEditingReferrals(false)} disabled={savingReferrals}>Cancel</Button>
                    <Button variant="contained" onClick={() => void saveReferralSources()} disabled={savingReferrals}>
                        {savingReferrals ? 'Saving…' : 'Save referral sources'}
                    </Button>
                </DialogActions>
            </Dialog>

            <Dialog
                open={editing}
                onClose={() => !saving && setEditing(false)}
                maxWidth="sm"
                fullWidth
            >
                <DialogTitle sx={{ color: workspace.ink, fontWeight: 700 }}>Edit case details</DialogTitle>
                <DialogContent>
                    <Stack
                        spacing={2.25}
                        sx={{ pt: 1 }}
                    >
                        <TextField
                            label="Case name"
                            value={editName}
                            onChange={(event) => setEditName(event.target.value)}
                            fullWidth
                        />
                        <TextField
                            label="Description"
                            value={editDescription}
                            onChange={(event) => setEditDescription(event.target.value)}
                            fullWidth
                            multiline
                            minRows={4}
                            disabled={descriptionLocked}
                        />
                        {descriptionLocked ? (
                            <Alert severity="warning">
                                Unlock the case description on the case page before editing it. Saving other case
                                details will preserve the encrypted description unchanged.
                            </Alert>
                        ) : (
                            <PhraseSourceControl
                                source={editDescriptionPhrase.source}
                                onSourceChange={editDescriptionPhrase.setSource}
                                customPhrase={editDescriptionPhrase.customPhrase}
                                onCustomPhraseChange={editDescriptionPhrase.setCustomPhrase}
                                purpose="encrypt"
                            />
                        )}
                        <TextField
                            select
                            label="Status"
                            value={editStatus}
                            onChange={(event) => setEditStatus(event.target.value)}
                            fullWidth
                        >
                            <MenuItem value="active">Active</MenuItem>
                            <MenuItem value="monitoring">Monitoring</MenuItem>
                            <MenuItem value="closed">Closed</MenuItem>
                        </TextField>
                    </Stack>
                </DialogContent>
                <DialogActions sx={{ px: 3, pb: 2.5 }}>
                    <Button
                        onClick={() => setEditing(false)}
                        disabled={saving}
                        sx={{ color: workspace.muted }}
                    >
                        Cancel
                    </Button>
                    <Button
                        variant="contained"
                        onClick={saveEdit}
                        disabled={saving
                            || !editName.trim()
                            || (!descriptionLocked
                                && Boolean(editDescription)
                                && editDescriptionPhrase.phrase === null)}
                        sx={{ bgcolor: workspace.teal, '&:hover': { bgcolor: workspace.tealDark } }}
                    >
                        {saving ? 'Saving…' : 'Save changes'}
                    </Button>
                </DialogActions>
            </Dialog>

            <Box sx={{ width: '100%' }}>
                <Paper
                    elevation={0}
                    sx={{
                        color: 'var(--mui-palette-app-headerText)',
                        background:
                            'linear-gradient(135deg, var(--mui-palette-app-headerStart) 0%, var(--mui-palette-app-headerEnd) 100%)',
                        border: 0,
                        borderBottom: '1px solid var(--mui-palette-app-headerBorder)',
                        borderRadius: 0,
                        boxShadow: '0 10px 26px var(--mui-palette-app-shadow)',
                    }}
                >
                    <Box
                        sx={{
                            width: '100%',
                            maxWidth: 1480,
                            mx: 'auto',
                            boxSizing: 'border-box',
                            px: { xs: 2, sm: 3, lg: 4 },
                            py: { xs: 1.25, sm: 1.5 },
                        }}
                    >
                        <Button
                            startIcon={<ArrowBack />}
                            onClick={() => navigate('/cases')}
                            sx={{
                                mb: 0.75,
                                px: 0.5,
                                py: 0.25,
                                color: 'var(--mui-palette-app-headerMuted)',
                                textTransform: 'none',
                                fontWeight: 650,
                                fontSize: '0.8rem',
                                '&:hover': {
                                    color: 'var(--mui-palette-app-headerText)',
                                    bgcolor: 'var(--mui-palette-app-headerHover)',
                                },
                            }}
                        >
                            All cases
                        </Button>

                        <Box
                            sx={{
                                display: 'grid',
                                gridTemplateColumns: { xs: '54px minmax(0, 1fr)', sm: '68px minmax(0, 1fr) auto' },
                                gap: { xs: 1.25, sm: 1.75 },
                                alignItems: 'start',
                            }}
                        >
                            <Box
                                component="img"
                                src={`https://picsum.photos/seed/${caseItem.id}/88/88`}
                                alt=""
                                sx={{
                                    width: { xs: 54, sm: 68 },
                                    height: { xs: 54, sm: 68 },
                                    objectFit: 'cover',
                                    borderRadius: 2,
                                    boxShadow: '0 7px 18px var(--mui-palette-app-shadow)',
                                }}
                            />

                            <Box sx={{ minWidth: 0 }}>
                                <Stack
                                    direction="row"
                                    sx={{ alignItems: 'center', flexWrap: 'wrap', gap: 0.75, mb: 0.35 }}
                                >
                                    <Typography
                                        variant="h4"
                                        component="h1"
                                        sx={{
                                            color: 'var(--mui-palette-app-headerText)',
                                            fontWeight: 700,
                                            fontSize: { xs: '1.3rem', sm: '1.65rem' },
                                            lineHeight: 1.2,
                                        }}
                                    >
                                        {caseItem.name}
                                    </Typography>
                                    <Chip
                                        label={status.label}
                                        size="small"
                                        sx={{
                                            color: status.color,
                                            bgcolor: status.background,
                                            border: `1px solid ${status.border}`,
                                            fontWeight: 700,
                                        }}
                                    />
                                </Stack>
                                {caseItem.description ? (
                                    <Box
                                        sx={{
                                            color: 'var(--mui-palette-app-headerMuted)',
                                            fontSize: '0.88rem',
                                            lineHeight: 1.45,
                                            maxWidth: 920,
                                        }}
                                    >
                                        <ProtectedText
                                            stored={caseItem.description}
                                            organizationId={organizationId}
                                            emptyText="No case description"
                                            compact
                                            onDecrypted={rememberDescription}
                                        />
                                    </Box>
                                ) : (
                                    <Typography sx={{ color: 'var(--mui-palette-app-headerMuted)', fontStyle: 'italic' }}>
                                        No case description
                                    </Typography>
                                )}
                                <Stack
                                    direction="row"
                                    sx={{ mt: 0.65, flexWrap: 'wrap', gap: { xs: 1.25, sm: 2 } }}
                                >
                                    <Typography
                                        variant="body2"
                                        sx={{ color: 'var(--mui-palette-app-headerMuted)', fontSize: '0.72rem' }}
                                    >
                                        Created {formatDate(caseItem.createdAt)}
                                    </Typography>
                                    <Typography
                                        variant="body2"
                                        sx={{ color: 'var(--mui-palette-app-headerMuted)', fontSize: '0.72rem' }}
                                    >
                                        Updated {formatDate(caseItem.updatedAt)}
                                    </Typography>
                                </Stack>
                            </Box>

                            <Button
                                variant="outlined"
                                startIcon={<EditOutlined />}
                                onClick={openEdit}
                                sx={{
                                    gridColumn: { xs: '1 / -1', sm: 'auto' },
                                    justifySelf: { xs: 'stretch', sm: 'end' },
                                    color: 'var(--mui-palette-app-headerText)',
                                    borderColor: 'var(--mui-palette-secondary-main)',
                                    textTransform: 'none',
                                    fontWeight: 700,
                                    fontSize: '0.78rem',
                                    py: 0.6,
                                    whiteSpace: 'nowrap',
                                    '&:hover': {
                                        color: 'var(--mui-palette-app-headerText)',
                                        borderColor: 'var(--mui-palette-app-headerMuted)',
                                        bgcolor: 'var(--mui-palette-app-headerHover)',
                                    },
                                }}
                            >
                                Edit case details
                            </Button>
                        </Box>

                        <Divider sx={{ my: 1.1, borderColor: 'var(--mui-palette-app-headerBorder)' }} />

                        <Box
                            sx={{
                                display: 'flex',
                                alignItems: 'center',
                                flexWrap: 'wrap',
                                gap: 0.75,
                                minHeight: 30,
                                '&& .MuiChip-root': {
                                    height: 28,
                                    color: 'var(--mui-palette-app-headerText)',
                                    bgcolor: 'var(--mui-palette-app-headerHover)',
                                    border: '1px solid var(--mui-palette-app-headerBorder)',
                                    fontSize: '0.72rem',
                                },
                                '&& .MuiChip-root:hover': { bgcolor: 'var(--mui-palette-app-headerHover)' },
                            }}
                        >
                            <Typography
                                sx={{
                                    color: 'var(--mui-palette-app-headerText)',
                                    fontSize: '0.8rem',
                                    fontWeight: 700,
                                    mr: 0.25,
                                }}
                            >
                                Codes
                            </Typography>
                            {caseItem.codes?.length ? (
                                caseItem.codes.map((code) => (
                                    <CodeChip
                                        key={code}
                                        code={code}
                                        compact
                                    />
                                ))
                            ) : (
                                <Typography
                                    variant="body2"
                                    sx={{ color: 'var(--mui-palette-app-headerMuted)', fontSize: '0.78rem' }}
                                >
                                    No codes assigned
                                </Typography>
                            )}
                            <Button
                                startIcon={<EditOutlined />}
                                onClick={() => setShowEditCodes(true)}
                                sx={{
                                    ml: { xs: 0, sm: 'auto' },
                                    px: 0.75,
                                    py: 0.35,
                                    color: 'var(--mui-palette-app-headerText)',
                                    textTransform: 'none',
                                    fontSize: '0.75rem',
                                    fontWeight: 700,
                                    whiteSpace: 'nowrap',
                                    '&:hover': {
                                        color: 'var(--mui-palette-app-headerText)',
                                        bgcolor: 'var(--mui-palette-app-headerHover)',
                                    },
                                }}
                            >
                                Manage codes
                            </Button>
                        </Box>

                        <Divider sx={{ my: 1.1, borderColor: 'var(--mui-palette-app-headerBorder)' }} />

                        <Box
                            sx={{
                                display: 'flex',
                                alignItems: 'center',
                                flexWrap: 'wrap',
                                gap: 0.75,
                                minHeight: 30,
                                '&& .MuiChip-root': {
                                    height: 28,
                                    color: 'var(--mui-palette-app-headerText)',
                                    bgcolor: 'var(--mui-palette-app-headerHover)',
                                    border: '1px solid var(--mui-palette-app-headerBorder)',
                                    fontSize: '0.72rem',
                                },
                            }}
                        >
                            <Typography
                                sx={{
                                    color: 'var(--mui-palette-app-headerText)',
                                    fontSize: '0.8rem',
                                    fontWeight: 700,
                                    mr: 0.25,
                                }}
                            >
                                Referral sources
                            </Typography>
                            {referralSourcesRes.isLoading ? (
                                <CircularProgress size={18} sx={{ color: 'var(--mui-palette-app-headerMuted)' }} />
                            ) : referralSourcesRes.data?.length ? (
                                referralSourcesRes.data.map((source) => (
                                    <Chip
                                        key={source.id}
                                        label={source.detail ? `${source.name} — ${source.detail}` : source.name}
                                        size="small"
                                    />
                                ))
                            ) : (
                                <Typography
                                    variant="body2"
                                    sx={{ color: 'var(--mui-palette-app-headerMuted)', fontSize: '0.78rem' }}
                                >
                                    None recorded
                                </Typography>
                            )}
                            <Button
                                startIcon={<EditOutlined />}
                                onClick={openReferralEditor}
                                sx={{
                                    ml: { xs: 0, sm: 'auto' },
                                    px: 0.75,
                                    py: 0.35,
                                    color: 'var(--mui-palette-app-headerText)',
                                    textTransform: 'none',
                                    fontSize: '0.75rem',
                                    fontWeight: 700,
                                    whiteSpace: 'nowrap',
                                    '&:hover': {
                                        color: 'var(--mui-palette-app-headerText)',
                                        bgcolor: 'var(--mui-palette-app-headerHover)',
                                    },
                                }}
                            >
                                Manage referral sources
                            </Button>
                        </Box>
                    </Box>
                </Paper>

                <Box
                    sx={{
                        width: '100%',
                        maxWidth: 1480,
                        mx: 'auto',
                        boxSizing: 'border-box',
                        px: { xs: 2, sm: 3, lg: 4 },
                        pt: { xs: 1.5, sm: 2 },
                        pb: { xs: 2, sm: 3, lg: 4 },
                        display: 'grid',
                        gridTemplateColumns: { xs: 'minmax(0, 1fr)', md: 'minmax(300px, 0.8fr) minmax(0, 1.45fr)' },
                        gap: 2.5,
                        alignItems: 'start',
                    }}
                >
                    <Paper
                        component="section"
                        elevation={0}
                        sx={{
                            bgcolor: workspace.paper,
                            border: `1px solid ${workspace.border}`,
                            borderRadius: 3,
                            overflow: 'hidden',
                        }}
                    >
                        <Box
                            sx={{
                                minHeight: 72,
                                px: { xs: 2, sm: 2.5 },
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                gap: 1.5,
                                borderBottom: `1px solid ${workspace.border}`,
                            }}
                        >
                            <Box>
                                <Typography
                                    variant="h6"
                                    sx={{ color: workspace.ink, fontWeight: 700 }}
                                >
                                    Activity
                                </Typography>
                                <Typography
                                    variant="body2"
                                    sx={{ color: workspace.muted }}
                                >
                                    {sortedEntries.length} {sortedEntries.length === 1 ? 'entry' : 'entries'}
                                </Typography>
                            </Box>
                            <Button
                                variant="contained"
                                startIcon={<Add />}
                                onClick={() => navigate(`/case/${caseId}/add_entry`)}
                                sx={{
                                    bgcolor: workspace.purple,
                                    color: 'primary.contrastText',
                                    textTransform: 'none',
                                    fontWeight: 700,
                                    whiteSpace: 'nowrap',
                                    '&:hover': { bgcolor: 'primary.dark', color: 'primary.contrastText' },
                                }}
                            >
                                Add entry
                            </Button>
                        </Box>

                        {entriesRes.isLoading ? (
                            <Box sx={{ py: 6, display: 'grid', placeItems: 'center' }}>
                                <CircularProgress
                                    size={28}
                                    sx={{ color: workspace.teal }}
                                />
                            </Box>
                        ) : !sortedEntries.length ? (
                            <Box sx={{ px: 3, py: 6, textAlign: 'center' }}>
                                <CalendarMonthOutlined sx={{ color: 'text.disabled', fontSize: 34, mb: 1 }} />
                                <Typography sx={{ color: workspace.ink, fontWeight: 650 }}>No activity yet</Typography>
                                <Typography
                                    variant="body2"
                                    sx={{ color: workspace.muted, mt: 0.5 }}
                                >
                                    Add the first entry to begin the case record.
                                </Typography>
                            </Box>
                        ) : (
                            <Box
                                role="list"
                                aria-label="Case activity"
                            >
                                {sortedEntries.map((entry) => {
                                    const selected = entry.id === highlightedId
                                    return (
                                        <ButtonBase
                                            key={entry.id}
                                            role="listitem"
                                            onClick={() => setHighlightedId(entry.id)}
                                            sx={{
                                                width: '100%',
                                                px: { xs: 2, sm: 2.5 },
                                                py: 1.75,
                                                display: 'block',
                                                textAlign: 'left',
                                                borderBottom: `1px solid ${workspace.border}`,
                                                borderLeft: '4px solid',
                                                borderLeftColor: selected ? workspace.purple : 'transparent',
                                                bgcolor: selected ? workspace.tealPale : workspace.paper,
                                                transition: 'background-color 150ms ease, border-color 150ms ease',
                                                '&:hover': { bgcolor: selected ? workspace.tealPale : workspace.raised },
                                                '&:focus-visible': {
                                                    outline: `3px solid ${workspace.purple}`,
                                                    outlineOffset: -3,
                                                },
                                                '&:last-child': { borderBottom: 0 },
                                            }}
                                        >
                                            <Box
                                                sx={{
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'space-between',
                                                    gap: 2,
                                                }}
                                            >
                                                <Box sx={{ minWidth: 0 }}>
                                                    <Typography sx={{ color: workspace.ink, fontWeight: 700 }}>
                                                        {formatDate(entry.date)}
                                                    </Typography>
                                                    <Typography
                                                        variant="body2"
                                                        sx={{ color: workspace.muted, mt: 0.25 }}
                                                    >
                                                        {entry.medium || 'Method not recorded'}
                                                    </Typography>
                                                </Box>
                                                <Chip
                                                    icon={<ScheduleOutlined />}
                                                    label={formatMinutes(entry.duration)}
                                                    size="small"
                                                    sx={{
                                                        flexShrink: 0,
                                                        color: selected ? workspace.tealDark : workspace.muted,
                                                        bgcolor: selected ? 'action.selected' : 'action.hover',
                                                        '& .MuiChip-icon': { color: 'inherit' },
                                                    }}
                                                />
                                            </Box>
                                        </ButtonBase>
                                    )
                                })}
                            </Box>
                        )}
                    </Paper>

                    <Paper
                        component="section"
                        elevation={0}
                        sx={{
                            bgcolor: workspace.paper,
                            border: `1px solid ${workspace.border}`,
                            borderRadius: 3,
                            overflow: 'hidden',
                            position: { md: 'sticky' },
                            top: { md: 24 },
                        }}
                    >
                        <Box
                            sx={{
                                minHeight: 72,
                                px: { xs: 2, sm: 3 },
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                gap: 2,
                                borderBottom: `1px solid ${workspace.border}`,
                            }}
                        >
                            <Box>
                                <Typography
                                    variant="h6"
                                    sx={{ color: workspace.ink, fontWeight: 700 }}
                                >
                                    Entry details
                                </Typography>
                                <Typography
                                    variant="body2"
                                    sx={{ color: workspace.muted }}
                                >
                                    {highlightedEntry ? formatDate(highlightedEntry.date) : 'Select an activity entry'}
                                </Typography>
                            </Box>
                            {highlightedEntry?.notes && isEncrypted(highlightedEntry.notes) && (
                                <Chip
                                    icon={<LockOutlined />}
                                    label="Encrypted notes"
                                    size="small"
                                    sx={{
                                        color: workspace.tealDark,
                                        bgcolor: workspace.tealPale,
                                        '& .MuiChip-icon': { color: 'inherit' },
                                    }}
                                />
                            )}
                        </Box>

                        {!highlightedEntry ? (
                            <Box
                                sx={{
                                    minHeight: 310,
                                    px: 3,
                                    py: 7,
                                    display: 'grid',
                                    placeItems: 'center',
                                    textAlign: 'center',
                                }}
                            >
                                <Box>
                                    <CalendarMonthOutlined sx={{ color: 'text.disabled', fontSize: 38 }} />
                                    <Typography sx={{ mt: 1, color: workspace.muted }}>
                                        Select an activity entry to see its details.
                                    </Typography>
                                </Box>
                            </Box>
                        ) : (
                            <Box sx={{ p: { xs: 2, sm: 3 } }}>
                                <Stack
                                    direction="row"
                                    sx={{ flexWrap: 'wrap', gap: { xs: 2, sm: 4 }, mb: 3 }}
                                >
                                    <DetailFact
                                        label="Date"
                                        value={formatDate(highlightedEntry.date)}
                                    />
                                    <DetailFact
                                        label="Method"
                                        value={highlightedEntry.medium || '—'}
                                    />
                                    <DetailFact
                                        label="Duration"
                                        value={formatMinutes(highlightedEntry.duration)}
                                    />
                                </Stack>
                                <Divider sx={{ borderColor: workspace.border }} />

                                <Box sx={{ py: 3 }}>
                                    <Typography sx={{ color: workspace.ink, fontWeight: 700, mb: 1 }}>Notes</Typography>
                                    <ProtectedText
                                        key={highlightedEntry.id}
                                        stored={highlightedEntry.notes ?? ''}
                                        organizationId={organizationId}
                                        emptyText="No notes recorded."
                                    />
                                </Box>

                                <Divider sx={{ borderColor: workspace.border }} />
                                <Box sx={{ pt: 3 }}>
                                    <Typography sx={{ color: workspace.ink, fontWeight: 700, mb: 1.25 }}>
                                        People
                                    </Typography>
                                    {highlightedPeopleRes.isLoading ? (
                                        <CircularProgress
                                            size={22}
                                            sx={{ color: workspace.teal }}
                                        />
                                    ) : !(highlightedPeopleRes.data ?? []).length ? (
                                        <Typography sx={{ color: workspace.muted, fontStyle: 'italic' }}>
                                            No people associated with this entry.
                                        </Typography>
                                    ) : (
                                        <Stack
                                            direction="row"
                                            sx={{ flexWrap: 'wrap', gap: 0.75 }}
                                        >
                                            {(highlightedPeopleRes.data ?? []).map((person) => (
                                                <Chip
                                                    key={person.id}
                                                    label={personLabel(person)}
                                                    sx={{ color: workspace.tealDark, bgcolor: workspace.tealPale }}
                                                />
                                            ))}
                                        </Stack>
                                    )}
                                </Box>
                            </Box>
                        )}
                    </Paper>
                </Box>
            </Box>
        </Box>
    )
}

function DetailFact({ label, value }: { label: string; value: string }) {
    return (
        <Box>
            <Typography
                variant="caption"
                sx={{
                    display: 'block',
                    color: workspace.muted,
                    fontWeight: 700,
                    textTransform: 'uppercase',
                    letterSpacing: 0.7,
                }}
            >
                {label}
            </Typography>
            <Typography sx={{ color: workspace.ink, mt: 0.25 }}>{value}</Typography>
        </Box>
    )
}
