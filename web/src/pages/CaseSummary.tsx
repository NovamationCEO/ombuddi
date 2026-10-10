import { pageLayoutStyle } from '../theme/pageLayout'
import { Add, ArrowBack, CalendarMonthOutlined, EditOutlined } from '@mui/icons-material'
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
    Stack,
    TextField,
    Typography,
} from '@mui/material'
import React from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { CaseSceneThumbnail } from '../components/CaseSceneThumbnail'
import { caseCodeFlagStyle } from '../components/caseCodeFlagStyle'
import { EditCodeDialog } from '../components/EditCodeDialog'
import { ReferralSourceSelector } from '../components/ReferralSourceSelector'
import { ProtectedText } from '../components/ProtectedText'
import { useSnack } from '../libraries/useSnack'
import { useGetter } from '../tools/db_tools/useGetter'
import { updater } from '../tools/db_tools/updater'
import { isEncrypted } from '../tools/notesCrypto'
import { referralSelectionsAreValid } from '../tools/referralSources'
import {
    CaseReferralSourceType,
    CaseType,
    EntryType,
    PersonType,
    ReferralSourceSelectionType,
} from '../types/majorTypes'
import { usePhraseSelection } from '../tools/phraseSource'
import { PhraseSourceControl } from '../components/PhraseSourceControl'
import { EntryPersonMarker } from '../components/EntryPersonMarker'
import { uniquePeopleById } from '../components/personDisplay'
import { formatCalendarDate } from '../tools/calendarDate'
import { useResolvedCaseCodes } from '../tools/useResolvedCaseCodes'
import { ioaCodeIdSet } from '../constants/ioaConstants'
import { ThemeProvider } from '@mui/material/styles'
import { caseFolderTheme } from '../theme/caseFolderTheme'
import '../theme/caseFolder.css'
import './CaseSummary.css'
import { protectedTextForSave } from '../tools/protectedTextEdit'
import { useCurrentOmbuds } from '../tools/useCurrentOmbuds'

const workspace = {
    ink: 'text.primary',
    muted: 'text.secondary',
    teal: 'secondary.main',
    tealDark: 'secondary.dark',
} as const

const statusStyles = {
    active: { label: 'Active', color: '#315B40', background: '#E2EDDF' },
    monitoring: { label: 'Monitoring', color: '#775418', background: '#F5EAD0' },
    closed: { label: 'Closed', color: '#596361', background: '#E8ECE9' },
} as const

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
    const casePeopleRes = useGetter<PersonType[]>(['get_persons_by_case_id', caseId])
    const currentOmbudsRes = useCurrentOmbuds()
    const setSnack = useSnack((state) => state.setSnack)

    const [highlightedId, setHighlightedId] = React.useState<string | null>(null)
    const [showEditCodes, setShowEditCodes] = React.useState(false)
    const [editing, setEditing] = React.useState(false)
    const [saving, setSaving] = React.useState(false)
    const [editName, setEditName] = React.useState('')
    const [editDescription, setEditDescription] = React.useState('')
    const [decryptedDescription, setDecryptedDescription] = React.useState<string | null>(null)
    const [descriptionUnlockPhrase, setDescriptionUnlockPhrase] = React.useState<string | null>(null)
    const [changeDescriptionProtection, setChangeDescriptionProtection] = React.useState(false)
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
    const casePeople = React.useMemo(() => uniquePeopleById(casePeopleRes.data ?? []), [casePeopleRes.data])
    const resolvedCaseCodes = useResolvedCaseCodes(caseRes.data?.codes ?? [])

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
    const descriptionNeedsProtection =
        !descriptionLocked &&
        !isEncrypted(rawDescription) &&
        Boolean(editDescription) &&
        editDescription !== (decryptedDescription ?? '')

    React.useEffect(() => {
        setDecryptedDescription(isEncrypted(rawDescription) ? null : rawDescription)
        setDescriptionUnlockPhrase(isEncrypted(rawDescription) ? null : '')
        setChangeDescriptionProtection(false)
    }, [rawDescription])

    const rememberDescription = React.useCallback((plaintext: string, phraseUsed: string) => {
        setDecryptedDescription(plaintext)
        setDescriptionUnlockPhrase(phraseUsed)
    }, [])

    function openEdit() {
        setEditName(caseRes.data?.name ?? '')
        setEditDescription(decryptedDescription ?? '')
        setEditStatus(caseRes.data?.status ?? 'active')
        setChangeDescriptionProtection(false)
        setEditing(true)
    }

    async function saveEdit() {
        const replaceProtection = changeDescriptionProtection || descriptionNeedsProtection
        if (!descriptionLocked && replaceProtection && editDescriptionPhrase.phrase === null) {
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
                : await protectedTextForSave({
                      stored: rawDescription,
                      originalPlaintext: decryptedDescription ?? '',
                      editedPlaintext: editDescription,
                      unlockPhrase: descriptionUnlockPhrase,
                      replaceProtection,
                      replacementPhrase: editDescriptionPhrase.phrase,
                      organizationId,
                  })
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
        setEditReferralSources(
            (referralSourcesRes.data ?? []).map((source) => ({
                id: source.id,
                behavior: source.behavior,
                ...(source.detail ? { detail: source.detail } : {}),
            })),
        )
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
            <Box sx={{ minHeight: '100%', display: 'grid', placeItems: 'center', bgcolor: 'transparent' }}>
                <CircularProgress sx={{ color: workspace.teal }} />
            </Box>
        )
    }

    const caseItem = caseRes.data
    if (!caseItem) {
        return (
            <Box sx={{ minHeight: '100%', p: 4, bgcolor: 'transparent', color: workspace.ink }}>
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
    const isGeneral = caseItem.caseKind === 'general'
    const canAddEntry = !isGeneral || caseItem.ownerOmbudsId === currentOmbudsRes.data?.id
    const status = isGeneral
        ? {
              label: 'General',
              color: '#743D68',
              background: '#EFE5EE',
          }
        : (statusStyles[normalizedStatus] ?? statusStyles.active)

    return (
        <Box sx={pageLayoutStyle}>
            <Button
                startIcon={<ArrowBack />}
                onClick={() => navigate('/cases')}
                sx={{ mb: 0.5 }}
            >
                All cases
            </Button>
            <ThemeProvider theme={caseFolderTheme}>
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
                        <Button
                            onClick={() => setEditingReferrals(false)}
                            disabled={savingReferrals}
                        >
                            Cancel
                        </Button>
                        <Button
                            variant="contained"
                            onClick={() => void saveReferralSources()}
                            disabled={savingReferrals}
                        >
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
                            ) : descriptionNeedsProtection ? (
                                <Stack spacing={1.25}>
                                    <Alert severity="warning">
                                        This text was not previously protected. Choose how to protect it before saving;
                                        it will not be stored as plaintext.
                                    </Alert>
                                    <PhraseSourceControl
                                        source={editDescriptionPhrase.source}
                                        onSourceChange={editDescriptionPhrase.setSource}
                                        customPhrase={editDescriptionPhrase.customPhrase}
                                        onCustomPhraseChange={editDescriptionPhrase.setCustomPhrase}
                                        purpose="encrypt"
                                    />
                                </Stack>
                            ) : !changeDescriptionProtection ? (
                                <Stack spacing={1}>
                                    <Typography
                                        variant="body2"
                                        color="text.secondary"
                                    >
                                        Saving keeps the existing description protection. Changing the case name or
                                        status will not rotate its phrase.
                                    </Typography>
                                    <Button
                                        variant="outlined"
                                        size="small"
                                        onClick={() => setChangeDescriptionProtection(true)}
                                        sx={{ alignSelf: 'flex-start' }}
                                    >
                                        Change description phrase
                                    </Button>
                                </Stack>
                            ) : (
                                <Stack spacing={1.25}>
                                    <Alert severity="warning">
                                        Changing this phrase replaces the only phrase that can recover this description.
                                        Confirm it carefully; exact spaces count.
                                    </Alert>
                                    <PhraseSourceControl
                                        source={editDescriptionPhrase.source}
                                        onSourceChange={editDescriptionPhrase.setSource}
                                        customPhrase={editDescriptionPhrase.customPhrase}
                                        onCustomPhraseChange={editDescriptionPhrase.setCustomPhrase}
                                        purpose="encrypt"
                                    />
                                    <Button
                                        size="small"
                                        onClick={() => setChangeDescriptionProtection(false)}
                                        sx={{ alignSelf: 'flex-start' }}
                                    >
                                        Keep existing protection
                                    </Button>
                                </Stack>
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
                            disabled={
                                saving ||
                                !editName.trim() ||
                                (!descriptionLocked &&
                                    (changeDescriptionProtection || descriptionNeedsProtection) &&
                                    editDescriptionPhrase.phrase === null)
                            }
                            sx={{ bgcolor: workspace.teal, '&:hover': { bgcolor: workspace.tealDark } }}
                        >
                            {saving ? 'Saving…' : 'Save changes'}
                        </Button>
                    </DialogActions>
                </Dialog>

                <Box className="case-folder case-review-folder">
                    <Box
                        className="case-folder-tab"
                        aria-hidden="true"
                    >
                        {isGeneral ? 'General activity' : `${status.label} case`}
                    </Box>
                    <Box
                        component="section"
                        className="case-review-cover"
                        aria-labelledby="case-title"
                    >
                        <Box className="case-review-heading">
                            <Box sx={{ width: { xs: 52, sm: 88 }, height: { xs: 52, sm: 88 }, flexShrink: 0 }}>
                                <CaseSceneThumbnail seed={caseItem.id} />
                            </Box>
                            <Box sx={{ minWidth: 0, flex: 1 }}>
                                <Typography
                                    component="h1"
                                    id="case-title"
                                    className="case-review-title"
                                >
                                    {caseItem.name}
                                </Typography>
                                <Stack
                                    direction="row"
                                    useFlexGap
                                    spacing={1.5}
                                    sx={{ alignItems: 'center', flexWrap: 'wrap', mt: 1 }}
                                >
                                    <Chip
                                        label={status.label}
                                        size="small"
                                        sx={{ color: status.color, bgcolor: status.background, fontWeight: 650 }}
                                    />
                                    <Typography
                                        variant="caption"
                                        color="text.secondary"
                                    >
                                        Created {formatDate(caseItem.createdAt)}
                                    </Typography>
                                    <Typography
                                        variant="caption"
                                        color="text.secondary"
                                    >
                                        Updated {formatDate(caseItem.updatedAt)}
                                    </Typography>
                                </Stack>
                            </Box>
                            <Stack
                                className="case-review-actions"
                                direction="row"
                                useFlexGap
                                spacing={1}
                                sx={{ flexWrap: 'wrap', alignItems: 'center' }}
                            >
                                {canAddEntry && (
                                    <Button
                                        variant="contained"
                                        disableElevation
                                        startIcon={<Add />}
                                        onClick={() => navigate(`/case/${caseId}/add_entry`)}
                                    >
                                        Add entry
                                    </Button>
                                )}
                                {!isGeneral && (
                                    <Button
                                        startIcon={<EditOutlined />}
                                        onClick={openEdit}
                                    >
                                        Edit case details
                                    </Button>
                                )}
                            </Stack>
                        </Box>
                        <Box className={`case-review-context${isGeneral ? ' case-review-context--general' : ''}`}>
                            <Box sx={{ minWidth: 0 }}>
                                <Typography
                                    component="h2"
                                    className="case-review-label"
                                >
                                    Description
                                </Typography>
                                <ProtectedText
                                    key={caseId}
                                    stored={caseItem.description ?? ''}
                                    organizationId={organizationId}
                                    emptyText="No case description"
                                    compact
                                    unlockLabel="Unlock description"
                                    onDecrypted={rememberDescription}
                                />
                            </Box>
                            {!isGeneral && (
                                <Box sx={{ minWidth: 0 }}>
                                    <Stack
                                        direction="row"
                                        sx={{ alignItems: 'center', justifyContent: 'space-between', gap: 1 }}
                                    >
                                        <Typography
                                            component="h2"
                                            className="case-review-label"
                                        >
                                            Referral sources
                                        </Typography>
                                        <Button
                                            size="small"
                                            onClick={openReferralEditor}
                                            aria-label="Edit referral sources"
                                        >
                                            Edit
                                        </Button>
                                    </Stack>
                                    {referralSourcesRes.isLoading ? (
                                        <CircularProgress
                                            size={18}
                                            aria-label="Loading referral sources"
                                        />
                                    ) : referralSourcesRes.data?.length ? (
                                        <Stack spacing={0.5}>
                                            {referralSourcesRes.data.map((source) => (
                                                <Typography
                                                    key={source.id}
                                                    variant="body2"
                                                    sx={{ overflowWrap: 'anywhere' }}
                                                >
                                                    {source.name}
                                                    {source.detail ? ` — ${source.detail}` : ''}
                                                </Typography>
                                            ))}
                                        </Stack>
                                    ) : (
                                        <Typography
                                            variant="body2"
                                            color="text.secondary"
                                        >
                                            None recorded
                                        </Typography>
                                    )}
                                </Box>
                            )}
                            <Box sx={{ minWidth: 0 }}>
                                <Typography
                                    component="h2"
                                    className="case-review-label"
                                >
                                    People{casePeople.length ? ` (${casePeople.length})` : ''}
                                </Typography>
                                {casePeopleRes.isLoading ? (
                                    <CircularProgress
                                        size={18}
                                        aria-label="Loading case people"
                                    />
                                ) : casePeople.length ? (
                                    <Stack
                                        direction="row"
                                        useFlexGap
                                        spacing={1}
                                        sx={{ flexWrap: 'wrap' }}
                                    >
                                        {casePeople.map((person) => (
                                            <EntryPersonMarker
                                                key={person.id}
                                                person={person}
                                            />
                                        ))}
                                    </Stack>
                                ) : (
                                    <Typography
                                        variant="body2"
                                        color="text.secondary"
                                    >
                                        None recorded
                                    </Typography>
                                )}
                            </Box>
                        </Box>
                        {!canAddEntry && (
                            <Typography
                                variant="body2"
                                color="text.secondary"
                                sx={{ mt: 2 }}
                            >
                                This General record belongs to another ombuds.
                            </Typography>
                        )}
                    </Box>

                    <Box className={`case-review-body${isGeneral ? ' case-review-body--general' : ''}`}>
                        <Box
                            component="section"
                            className="case-review-index"
                            aria-labelledby="activity-title"
                        >
                            <Box sx={{ px: 2.5, py: 2 }}>
                                <Typography
                                    component="h2"
                                    id="activity-title"
                                    className="case-review-section-title"
                                >
                                    Activity
                                </Typography>
                                <Typography
                                    variant="body2"
                                    color="text.secondary"
                                >
                                    {sortedEntries.length} {sortedEntries.length === 1 ? 'entry' : 'entries'}
                                </Typography>
                            </Box>
                            {entriesRes.isLoading ? (
                                <Box sx={{ p: 4, textAlign: 'center' }}>
                                    <CircularProgress
                                        size={24}
                                        aria-label="Loading activity"
                                    />
                                </Box>
                            ) : !sortedEntries.length ? (
                                <Box sx={{ px: 2.5, pb: 3 }}>
                                    <Typography sx={{ fontWeight: 650 }}>No activity yet</Typography>
                                    <Typography
                                        variant="body2"
                                        color="text.secondary"
                                        sx={{ mt: 1 }}
                                    >
                                        {canAddEntry
                                            ? 'Add the first entry to begin the case record.'
                                            : 'No entries have been recorded.'}
                                    </Typography>
                                </Box>
                            ) : (
                                <Box
                                    component="ul"
                                    className="case-review-activity"
                                    aria-label="Case activity"
                                >
                                    {sortedEntries.map((entry) => (
                                        <Box
                                            component="li"
                                            key={entry.id}
                                        >
                                            <ButtonBase
                                                className={`case-review-activity-button${entry.id === highlightedId ? ' is-selected' : ''}`}
                                                aria-pressed={entry.id === highlightedId}
                                                aria-controls="case-entry-details"
                                                onClick={() => setHighlightedId(entry.id)}
                                            >
                                                <Typography
                                                    component="span"
                                                    sx={{ display: 'block', fontWeight: 700, fontSize: '0.95rem' }}
                                                >
                                                    {formatCalendarDate(entry.date)}
                                                </Typography>
                                                <Typography
                                                    component="span"
                                                    variant="body2"
                                                    color="text.secondary"
                                                    sx={{ display: 'block', mt: 0.25, fontSize: '0.85rem' }}
                                                >
                                                    {entry.medium || 'Method not recorded'} ·{' '}
                                                    {formatMinutes(entry.duration)}
                                                </Typography>
                                            </ButtonBase>
                                        </Box>
                                    ))}
                                </Box>
                            )}
                        </Box>

                        <Box
                            component="section"
                            className="case-review-entry"
                            id="case-entry-details"
                            aria-labelledby="entry-title"
                        >
                            <Stack
                                direction="row"
                                sx={{
                                    alignItems: 'flex-start',
                                    justifyContent: 'space-between',
                                    gap: 2,
                                    flexWrap: 'wrap',
                                    mb: 2,
                                }}
                            >
                                <Box>
                                    <Typography className="case-review-label">Entry details</Typography>
                                    <Typography
                                        component="h2"
                                        id="entry-title"
                                        className="case-review-section-title"
                                    >
                                        {highlightedEntry
                                            ? formatCalendarDate(highlightedEntry.date)
                                            : 'Select an activity entry'}
                                    </Typography>
                                </Box>
                                {highlightedEntry && highlightedEntry.ombudsId === currentOmbudsRes.data?.id && (
                                    <Button
                                        startIcon={<EditOutlined />}
                                        onClick={() => navigate(`/case/${caseId}/entry/${highlightedEntry.id}/edit`)}
                                        sx={{ textDecoration: 'underline' }}
                                    >
                                        Edit entry
                                    </Button>
                                )}
                            </Stack>
                            {!highlightedEntry ? (
                                <Box
                                    sx={{
                                        minHeight: 220,
                                        display: 'grid',
                                        placeContent: 'center',
                                        textAlign: 'center',
                                        color: 'text.secondary',
                                    }}
                                >
                                    <CalendarMonthOutlined sx={{ mx: 'auto', mb: 2, fontSize: 32 }} />
                                    <Typography>
                                        {sortedEntries.length
                                            ? 'Select an activity entry to see its details.'
                                            : 'Your case activity will appear here.'}
                                    </Typography>
                                </Box>
                            ) : (
                                <>
                                    <Stack
                                        direction="row"
                                        useFlexGap
                                        spacing={4}
                                        sx={{ flexWrap: 'wrap', mb: 2 }}
                                    >
                                        <DetailFact
                                            label="Method"
                                            value={highlightedEntry.medium || '—'}
                                        />
                                        <DetailFact
                                            label="Duration"
                                            value={formatMinutes(highlightedEntry.duration)}
                                        />
                                    </Stack>
                                    <Divider />
                                    <Box sx={{ py: 2, minHeight: 140, overflowWrap: 'anywhere' }}>
                                        <Typography
                                            component="h3"
                                            className="case-review-label"
                                        >
                                            Notes
                                        </Typography>
                                        <ProtectedText
                                            key={highlightedEntry.id}
                                            stored={highlightedEntry.notes ?? ''}
                                            organizationId={organizationId}
                                            emptyText="No notes recorded."
                                            unlockLabel="Unlock notes"
                                        />
                                    </Box>
                                    <Divider />
                                    <Box sx={{ pt: 2 }}>
                                        <Typography
                                            component="h3"
                                            className="case-review-label"
                                        >
                                            People in this entry
                                        </Typography>
                                        {highlightedPeopleRes.isLoading ? (
                                            <CircularProgress
                                                size={22}
                                                aria-label="Loading entry people"
                                            />
                                        ) : highlightedPeopleRes.data?.length ? (
                                            <Stack
                                                direction="row"
                                                useFlexGap
                                                spacing={1}
                                                sx={{ flexWrap: 'wrap' }}
                                            >
                                                {highlightedPeopleRes.data.map((person) => (
                                                    <EntryPersonMarker
                                                        key={person.id}
                                                        person={person}
                                                    />
                                                ))}
                                            </Stack>
                                        ) : (
                                            <Typography
                                                variant="body2"
                                                color="text.secondary"
                                            >
                                                No people associated with this entry.
                                            </Typography>
                                        )}
                                    </Box>
                                </>
                            )}
                        </Box>

                        {!isGeneral && (
                            <Box
                                component="aside"
                                className="case-review-codes"
                                aria-label="Case codes"
                            >
                                {[
                                    { title: 'IOA Codes', ioa: true },
                                    { title: 'Organization Codes', ioa: false },
                                ].map((group) => {
                                    const codes = resolvedCaseCodes.filter(
                                        (code) => ioaCodeIdSet.has(code.id) === group.ioa,
                                    )
                                    return (
                                        <Box
                                            component="section"
                                            key={group.title}
                                            aria-label={group.title}
                                        >
                                            <Typography
                                                component="h2"
                                                className="case-review-label"
                                            >
                                                {group.title}
                                            </Typography>
                                            <Stack
                                                spacing={1.5}
                                                sx={{ mt: 1.5, mb: 0.5 }}
                                            >
                                                {codes.map((code) => (
                                                    <Box
                                                        key={code.id}
                                                        className={`case-code-flag${group.ioa ? '' : ' case-code-flag--org'}`}
                                                        style={caseCodeFlagStyle(caseItem.id, code.id)}
                                                    >
                                                        <Button
                                                            onClick={() => setShowEditCodes(true)}
                                                            aria-label={`Edit ${group.title}: ${code.shortName} ${code.description}`}
                                                            sx={{
                                                                width: '100%',
                                                                display: 'block',
                                                                color: 'text.primary',
                                                                textAlign: 'left',
                                                                py: 0.75,
                                                                minHeight: 44,
                                                                overflowWrap: 'anywhere',
                                                            }}
                                                        >
                                                            <Typography
                                                                component="span"
                                                                sx={{
                                                                    display: 'block',
                                                                    fontWeight: 700,
                                                                    fontSize: '0.95rem',
                                                                }}
                                                            >
                                                                {code.shortName}
                                                            </Typography>
                                                            <Typography
                                                                component="span"
                                                                variant="body2"
                                                                sx={{ fontSize: '0.85rem', lineHeight: 1.4 }}
                                                            >
                                                                {code.description}
                                                            </Typography>
                                                        </Button>
                                                    </Box>
                                                ))}
                                            </Stack>
                                            <Button
                                                startIcon={<Add />}
                                                onClick={() => setShowEditCodes(true)}
                                                aria-label={`Add ${group.ioa ? 'IOA' : 'organization'} code`}
                                                sx={{ textDecoration: 'underline', textUnderlineOffset: '3px' }}
                                            >
                                                Add code
                                            </Button>
                                        </Box>
                                    )
                                })}
                            </Box>
                        )}
                    </Box>
                </Box>
            </ThemeProvider>
        </Box>
    )
}

function DetailFact({ label, value }: { label: string; value: string }) {
    return (
        <Box>
            <Typography className="case-review-label">{label}</Typography>
            <Typography>{value}</Typography>
        </Box>
    )
}
