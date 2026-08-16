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
import { useSessionSalt } from '../libraries/useSessionSalt'
import { useGetter } from '../tools/db_tools/useGetter'
import { updater } from '../tools/db_tools/updater'
import { decryptNotes, isEncrypted } from '../tools/notesCrypto'
import { CaseType, EntryType, PersonType } from '../types/majorTypes'

const workspace = {
    background: '#F3F6F5',
    paper: '#FFFFFF',
    ink: '#183337',
    muted: '#647578',
    teal: '#2F6668',
    tealDark: '#234E51',
    tealPale: '#EAF3F2',
    border: '#D9E3E1',
    purple: '#875C9B',
} as const

const statusStyles = {
    active: {
        label: 'Active',
        color: '#D8EEEE',
        background: 'rgba(140, 181, 178, 0.18)',
        border: 'rgba(140, 181, 178, 0.42)',
    },
    monitoring: {
        label: 'Monitoring',
        color: '#F2D49D',
        background: 'rgba(224, 174, 92, 0.16)',
        border: 'rgba(224, 174, 92, 0.4)',
    },
    closed: {
        label: 'Closed',
        color: '#CED8D6',
        background: 'rgba(182, 197, 195, 0.12)',
        border: 'rgba(182, 197, 195, 0.3)',
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
    const sessionSalt = useSessionSalt((state) => state.sessionSalt)

    const [highlightedId, setHighlightedId] = React.useState<string | null>(null)
    const [showEditCodes, setShowEditCodes] = React.useState(false)
    const [editing, setEditing] = React.useState(false)
    const [saving, setSaving] = React.useState(false)
    const [editName, setEditName] = React.useState('')
    const [editDescription, setEditDescription] = React.useState('')
    const [editStatus, setEditStatus] = React.useState('')
    const [decryptedNotes, setDecryptedNotes] = React.useState<string | null>(null)
    const [decryptFailed, setDecryptFailed] = React.useState(false)
    const [overrideSalt, setOverrideSalt] = React.useState('')

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

    React.useEffect(() => {
        setDecryptedNotes(null)
        setDecryptFailed(false)
        setOverrideSalt(sessionSalt ?? '')

        const rawNotes = highlightedEntry?.notes
        if (!rawNotes || !isEncrypted(rawNotes)) {
            setDecryptedNotes(rawNotes ?? '')
            return
        }
        decryptNotes(rawNotes, sessionSalt ?? '', organizationId).then((result) => {
            if (result !== null) setDecryptedNotes(result)
            else setDecryptFailed(true)
        })
    }, [highlightedEntry, organizationId, sessionSalt])

    function openEdit() {
        setEditName(caseRes.data?.name ?? '')
        setEditDescription(caseRes.data?.description ?? '')
        setEditStatus(caseRes.data?.status ?? 'active')
        setEditing(true)
    }

    async function saveEdit() {
        setSaving(true)
        try {
            await updater('update_case', {
                id: caseId,
                name: editName,
                description: editDescription,
                status: editStatus,
            })
            await caseRes.refetch()
            setEditing(false)
        } finally {
            setSaving(false)
        }
    }

    async function tryOverrideSalt() {
        const rawNotes = highlightedEntry?.notes
        if (!rawNotes) return
        const result = await decryptNotes(rawNotes, overrideSalt, organizationId)
        if (result !== null) {
            setDecryptedNotes(result)
            setDecryptFailed(false)
        } else {
            setDecryptFailed(true)
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
                        />
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
                        disabled={saving || !editName.trim()}
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
                        color: '#F3F2EC',
                        background: 'linear-gradient(135deg, #102D31 0%, #1F4B4F 100%)',
                        border: 0,
                        borderBottom: '1px solid rgba(202, 220, 218, 0.18)',
                        borderRadius: 0,
                        boxShadow: '0 10px 26px rgba(8, 31, 34, 0.16)',
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
                                color: '#BDD1CF',
                                textTransform: 'none',
                                fontWeight: 650,
                                fontSize: '0.8rem',
                                '&:hover': { color: '#FFFFFF', bgcolor: 'rgba(255, 255, 255, 0.06)' },
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
                                    boxShadow: '0 7px 18px rgba(3, 18, 21, 0.34)',
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
                                            color: '#F3F2EC',
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
                                    <Typography
                                        sx={{
                                            color: '#BDD0CE',
                                            fontSize: '0.88rem',
                                            lineHeight: 1.45,
                                            maxWidth: 920,
                                            display: '-webkit-box',
                                            WebkitLineClamp: { xs: 2, sm: 1 },
                                            WebkitBoxOrient: 'vertical',
                                            overflow: 'hidden',
                                        }}
                                    >
                                        {caseItem.description}
                                    </Typography>
                                ) : (
                                    <Typography sx={{ color: '#BDD0CE', fontStyle: 'italic' }}>
                                        No case description
                                    </Typography>
                                )}
                                <Stack
                                    direction="row"
                                    sx={{ mt: 0.65, flexWrap: 'wrap', gap: { xs: 1.25, sm: 2 } }}
                                >
                                    <Typography
                                        variant="body2"
                                        sx={{ color: '#BDD0CE', fontSize: '0.72rem' }}
                                    >
                                        Created {formatDate(caseItem.createdAt)}
                                    </Typography>
                                    <Typography
                                        variant="body2"
                                        sx={{ color: '#BDD0CE', fontSize: '0.72rem' }}
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
                                    color: '#E5F1EF',
                                    borderColor: '#8CB5B2',
                                    textTransform: 'none',
                                    fontWeight: 700,
                                    fontSize: '0.78rem',
                                    py: 0.6,
                                    whiteSpace: 'nowrap',
                                    '&:hover': {
                                        color: '#FFFFFF',
                                        borderColor: '#C7DCDA',
                                        bgcolor: 'rgba(255, 255, 255, 0.08)',
                                    },
                                }}
                            >
                                Edit case details
                            </Button>
                        </Box>

                        <Divider sx={{ my: 1.1, borderColor: 'rgba(202, 220, 218, 0.2)' }} />

                        <Box
                            sx={{
                                display: 'flex',
                                alignItems: 'center',
                                flexWrap: 'wrap',
                                gap: 0.75,
                                minHeight: 30,
                                '&& .MuiChip-root': {
                                    height: 28,
                                    color: '#F3F2EC',
                                    bgcolor: 'rgba(255, 255, 255, 0.1)',
                                    border: '1px solid rgba(255, 255, 255, 0.18)',
                                    fontSize: '0.72rem',
                                },
                                '&& .MuiChip-root:hover': { bgcolor: 'rgba(255, 255, 255, 0.16)' },
                            }}
                        >
                            <Typography sx={{ color: '#F3F2EC', fontSize: '0.8rem', fontWeight: 700, mr: 0.25 }}>
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
                                    sx={{ color: '#BDD0CE', fontSize: '0.78rem' }}
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
                                    color: '#DCEAE8',
                                    textTransform: 'none',
                                    fontSize: '0.75rem',
                                    fontWeight: 700,
                                    whiteSpace: 'nowrap',
                                    '&:hover': { color: '#FFFFFF', bgcolor: 'rgba(255, 255, 255, 0.08)' },
                                }}
                            >
                                Manage codes
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
                                    color: '#FFFFFF',
                                    textTransform: 'none',
                                    fontWeight: 700,
                                    whiteSpace: 'nowrap',
                                    '&:hover': { bgcolor: '#70477F', color: '#FFFFFF' },
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
                                <CalendarMonthOutlined sx={{ color: '#9AA9A7', fontSize: 34, mb: 1 }} />
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
                                                '&:hover': { bgcolor: selected ? workspace.tealPale : '#F7FAF9' },
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
                                                        bgcolor: selected ? '#DCECE9' : '#F0F4F3',
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
                                    <CalendarMonthOutlined sx={{ color: '#A6B2B0', fontSize: 38 }} />
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
                                    {decryptFailed ? (
                                        <Paper
                                            elevation={0}
                                            sx={{
                                                p: 2,
                                                bgcolor: '#FFF8EB',
                                                border: '1px solid #EDD5A5',
                                                borderRadius: 2,
                                            }}
                                        >
                                            <Typography sx={{ color: '#76551F', fontWeight: 650 }}>
                                                These notes use a different salt phrase.
                                            </Typography>
                                            <Typography
                                                variant="body2"
                                                sx={{ color: '#876B3E', mt: 0.5, mb: 1.5 }}
                                            >
                                                Enter the phrase used when this entry was saved.
                                            </Typography>
                                            <Stack
                                                direction={{ xs: 'column', sm: 'row' }}
                                                spacing={1}
                                            >
                                                <TextField
                                                    size="small"
                                                    label="Salt phrase"
                                                    value={overrideSalt}
                                                    onChange={(event) => setOverrideSalt(event.target.value)}
                                                    onKeyDown={(event) => {
                                                        if (event.key === 'Enter') tryOverrideSalt()
                                                    }}
                                                    sx={{ flex: 1, bgcolor: workspace.paper }}
                                                />
                                                <Button
                                                    variant="contained"
                                                    onClick={tryOverrideSalt}
                                                    sx={{
                                                        bgcolor: workspace.teal,
                                                        '&:hover': { bgcolor: workspace.tealDark },
                                                    }}
                                                >
                                                    Decrypt notes
                                                </Button>
                                            </Stack>
                                        </Paper>
                                    ) : (
                                        <Typography
                                            sx={{
                                                minHeight: 80,
                                                color: decryptedNotes ? workspace.ink : workspace.muted,
                                                fontStyle: decryptedNotes ? 'normal' : 'italic',
                                                lineHeight: 1.7,
                                                whiteSpace: 'pre-wrap',
                                            }}
                                        >
                                            {decryptedNotes === null
                                                ? 'Decrypting…'
                                                : decryptedNotes || 'No notes recorded.'}
                                        </Typography>
                                    )}
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
