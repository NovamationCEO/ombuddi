import { pagePadding, pageTitleStyle } from '../theme/pageLayout'
import {
    Alert,
    Box,
    Button,
    Chip,
    CircularProgress,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    Divider,
    FormControlLabel,
    Paper,
    Radio,
    RadioGroup,
    Stack,
    TextField,
    Typography,
} from '@mui/material'
import { useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { useNavigate, useParams } from 'react-router-dom'
import { useGetter } from '../tools/db_tools/useGetter'
import { CaseType, EntryType, PersonType } from '../types/majorTypes'
import { creator } from '../tools/db_tools/creator'
import { updater } from '../tools/db_tools/updater'
import { deleter } from '../tools/db_tools/deleter'
import { PersonFinder } from '../components/PersonFinder'
import { PersonForm } from '../components/AddPerson/PersonForm'
import { ArrowBack, LockOutlined, PersonAddOutlined, SaveOutlined } from '@mui/icons-material'
import React from 'react'
import Grid2 from '@mui/material/Grid'
import { usePicklists } from '../tools/usePicklists'
import { encryptNotes, isEncrypted } from '../tools/notesCrypto'
import { usePhraseSelection } from '../tools/phraseSource'
import { PhraseSourceControl } from '../components/PhraseSourceControl'
import { PersonAvatar } from '../components/PersonAvatar'
import { ProtectedText } from '../components/ProtectedText'
import { useSnack } from '../libraries/useSnack'
import { entryPersonChanges } from '../tools/entryPersonChanges'
import { calendarDateInputValue, localCalendarDateInputValue } from '../tools/calendarDate'
import { protectedTextForSave } from '../tools/protectedTextEdit'
import { useCurrentOmbuds } from '../tools/useCurrentOmbuds'

const entryWorkspace = {
    background: 'var(--mui-palette-background-default)',
    paper: 'var(--mui-palette-background-paper)',
    ink: 'var(--mui-palette-text-primary)',
    muted: 'var(--mui-palette-text-secondary)',
    teal: 'var(--mui-palette-secondary-main)',
    tealDark: 'var(--mui-palette-secondary-dark)',
    tealPale: 'var(--mui-palette-app-surfaceTint)',
    border: 'var(--mui-palette-divider)',
    borderStrong: 'var(--mui-palette-app-borderStrong)',
    purple: 'var(--mui-palette-primary-main)',
    purpleDark: 'var(--mui-palette-primary-dark)',
} as const

const fieldStyle = {
    '& .MuiInputLabel-root': { color: entryWorkspace.muted },
    '& .MuiInputLabel-root.Mui-focused': { color: entryWorkspace.teal },
    '& .MuiOutlinedInput-root': {
        color: entryWorkspace.ink,
        bgcolor: entryWorkspace.paper,
        '& fieldset': { borderColor: entryWorkspace.borderStrong },
        '&:hover fieldset': { borderColor: entryWorkspace.teal },
        '&.Mui-focused fieldset': { borderColor: entryWorkspace.teal },
    },
} as const

/** Compact label for a Person chip — demographics only, no identity. */
function personLabel(p: PersonType): string {
    if (p.isPublic && p.publicName) return p.publicName
    const parts = [p.primaryRole, p.generation, p.gender].filter((s) => s && s !== 'unknown' && s !== 'N/A')
    return parts.length > 0 ? parts.join(' · ') : 'Unspecified'
}

export function AddEntry() {
    const { caseId, entryId } = useParams()
    const isEditing = Boolean(entryId)
    const caseRes = useGetter<CaseType>(['get_case_by_id', caseId])
    const casePeopleRes = useGetter<PersonType[]>(['get_persons_by_case_id', caseId])
    const entryRes = useGetter<EntryType>(['get_entry_by_id', entryId])
    const existingEntryPeopleRes = useGetter<PersonType[]>(['get_persons_by_entry_id', entryId])
    const currentOmbudsRes = useCurrentOmbuds(isEditing)
    const [notes, setNotes] = useState('')
    const [storedNotes, setStoredNotes] = useState('')
    const [originalNotes, setOriginalNotes] = useState('')
    const [unlockPhrase, setUnlockPhrase] = useState<string | null>(null)
    const [changeNoteProtection, setChangeNoteProtection] = useState(false)
    const [notesLocked, setNotesLocked] = useState(false)
    const [entryInitialized, setEntryInitialized] = useState(!isEditing)
    const navigate = useNavigate()
    const queryClient = useQueryClient()
    const setSnack = useSnack((state) => state.setSnack)
    const [duration, setDuration] = useState(30)
    const [eventDate, setEventDate] = useState(() => localCalendarDateInputValue())
    const notePhrase = usePhraseSelection()
    const [showPeopleDialog, setShowPeopleDialog] = React.useState(false)
    const [isSaving, setIsSaving] = React.useState(false)
    const initializedEntryId = React.useRef<string | null>(null)
    const originalPersonIds = React.useRef<string[]>([])

    // Entry medium and priority are org-customizable picklists. The stored
    // value on entries.medium is the picklist row's display name directly
    // (e.g. "In Person") — see schema.sql notes on picklists.
    const mediums = usePicklists('medium')
    const priorities = usePicklists('priority')
    const [medium, setMedium] = useState('')
    const [entryPriority, setEntryPriority] = useState('')

    // Auto-select the first option (lowest index) once the picklists arrive,
    // so the ombuds doesn't have to start by clicking radios.
    React.useEffect(() => {
        if (!medium && mediums.items.length > 0) {
            setMedium(mediums.items[0].name)
        }
    }, [mediums.items, medium])

    React.useEffect(() => {
        if (!entryPriority && priorities.items.length > 0) {
            setEntryPriority(priorities.items[0].name)
        }
    }, [priorities.items, entryPriority])

    // People staged for this entry. New entries send them with the entry so the
    // server can create the note and all relationships in one transaction.
    const [entryPeople, setEntryPeople] = useState<PersonType[]>([])

    React.useEffect(() => {
        const entry = entryRes.data
        const people = existingEntryPeopleRes.data
        if (!isEditing || !entryId || !entry || !people || initializedEntryId.current === entryId) return
        if (entry.caseId !== caseId) return

        setEventDate((current) => calendarDateInputValue(entry.date) ?? current)
        setMedium(entry.medium)
        setDuration(entry.duration)
        setStoredNotes(entry.notes ?? '')
        const encrypted = isEncrypted(entry.notes ?? '')
        setNotes(encrypted ? '' : (entry.notes ?? ''))
        setOriginalNotes(encrypted ? '' : (entry.notes ?? ''))
        setUnlockPhrase(encrypted ? null : '')
        setNotesLocked(encrypted)
        setChangeNoteProtection(false)
        setEntryPeople(people)
        originalPersonIds.current = people.map((person) => person.id)
        initializedEntryId.current = entryId
        setEntryInitialized(true)
    }, [caseId, entryId, entryRes.data, existingEntryPeopleRes.data, isEditing])

    // Inline "Create new user" dialog: triggered from PersonFinder when no
    // search matches. The typed name pre-fills PersonForm so the ombuds
    // doesn't retype it.
    const [createPersonName, setCreatePersonName] = useState<string | null>(null)
    const [finderClearTrigger, setFinderClearTrigger] = useState(0)
    const showCreatePersonDialog = createPersonName !== null

    function addPerson(person: PersonType) {
        setEntryPeople((prev) => (prev.some((p) => p.id === person.id) ? prev : [...prev, person]))
    }

    function removePerson(personId: string) {
        setEntryPeople((prev) => prev.filter((p) => p.id !== personId))
    }

    const notesNeedProtection =
        isEditing && !notesLocked && !isEncrypted(storedNotes) && Boolean(notes) && notes !== originalNotes

    async function save() {
        const organizationId = caseRes.data?.organizationId
        const replaceProtection = changeNoteProtection || notesNeedProtection
        const replacementRequired = isEditing ? replaceProtection : Boolean(notes)
        if (!organizationId || isSaving || (!notesLocked && replacementRequired && notePhrase.phrase === null)) return
        setIsSaving(true)
        try {
            const nextStoredNotes = isEditing
                ? await protectedTextForSave({
                      stored: storedNotes,
                      originalPlaintext: originalNotes,
                      editedPlaintext: notes,
                      unlockPhrase,
                      replaceProtection,
                      replacementPhrase: notePhrase.phrase,
                      organizationId,
                  })
                : notes
                  ? await encryptNotes(notes, notePhrase.phrase ?? '', organizationId)
                  : ''
            const payload = {
                caseId,
                date: eventDate,
                medium,
                duration,
                notes: nextStoredNotes,
            }
            if (isEditing && entryId) {
                await updater('update_entry', { id: entryId, ...payload })
                const { additions, removals } = entryPersonChanges(originalPersonIds.current, entryPeople)

                await Promise.all([
                    ...additions.map((person) =>
                        creator<{ entryId: string; personId: string }>('add_entry_person', {
                            entryId,
                            personId: person.id,
                        }),
                    ),
                    ...removals.map((personId) =>
                        deleter<{ entryId: string; personId: string }>('remove_entry_person', {
                            entryId,
                            personId,
                        }),
                    ),
                ])
            } else {
                await creator<{ id: string; success: boolean }>('add_entry', {
                    ...payload,
                    personIds: entryPeople.map((person) => person.id),
                })
            }
            await queryClient.invalidateQueries({ queryKey: ['get_entries_by_case_id', caseId] })
            await queryClient.invalidateQueries({ queryKey: ['get_persons_by_case_id', caseId] })
            if (entryId) {
                await queryClient.invalidateQueries({ queryKey: ['get_entry_by_id', entryId] })
                await queryClient.invalidateQueries({ queryKey: ['get_persons_by_entry_id', entryId] })
            }
            setSnack({
                message: isEditing ? 'Entry updated.' : 'Entry saved.',
                severity: 'success',
            })
            navigate(`/case/${caseId}`)
        } catch (error) {
            setSnack({
                message: error instanceof Error ? error.message : 'Unable to save the entry.',
                severity: 'error',
            })
        } finally {
            setIsSaving(false)
        }
    }

    // People on the case but not yet staged for this entry.
    const casePeopleNotStaged = (casePeopleRes.data ?? []).filter((cp) => !entryPeople.some((ep) => ep.id === cp.id))

    if (
        isEditing &&
        (entryRes.isError ||
            existingEntryPeopleRes.isError ||
            Boolean(entryRes.data && entryRes.data.caseId !== caseId))
    ) {
        return (
            <Box sx={{ minHeight: 320, display: 'grid', placeItems: 'center', p: 3 }}>
                <Stack
                    spacing={2}
                    sx={{ alignItems: 'center' }}
                >
                    <Typography>Unable to load this entry for editing.</Typography>
                    <Button onClick={() => navigate(`/case/${caseId}`)}>Back to case</Button>
                </Stack>
            </Box>
        )
    }

    if (isEditing && !entryInitialized) {
        return (
            <Box sx={{ minHeight: 320, display: 'grid', placeItems: 'center' }}>
                <CircularProgress />
            </Box>
        )
    }

    if (isEditing && entryRes.data && currentOmbudsRes.data && entryRes.data.ombudsId !== currentOmbudsRes.data.id) {
        return (
            <Box sx={{ minHeight: 320, display: 'grid', placeItems: 'center', p: 3 }}>
                <Stack
                    spacing={2}
                    sx={{ alignItems: 'center', textAlign: 'center' }}
                >
                    <Typography>Only the ombuds who recorded this entry can edit it.</Typography>
                    <Typography
                        variant="body2"
                        color="text.secondary"
                    >
                        You can still view the entry from the case record.
                    </Typography>
                    <Button onClick={() => navigate(`/case/${caseId}`)}>Back to case</Button>
                </Stack>
            </Box>
        )
    }

    return (
        <Box>
            {/*
             * Inline "Create new user" dialog. Stacks on top of the People
             * dialog (MUI handles z-ordering automatically) so the ombuds
             * stays inside the AddEntry flow instead of being routed to
             * /add_person and losing context.
             */}
            <Dialog
                open={showCreatePersonDialog}
                onClose={() => setCreatePersonName(null)}
                maxWidth={'lg'}
                fullWidth
            >
                <DialogTitle>Create New Person</DialogTitle>
                <DialogContent>
                    {showCreatePersonDialog && (
                        <PersonForm
                            initialName={createPersonName ?? ''}
                            onSaved={(person) => {
                                addPerson(person)
                                setCreatePersonName(null)
                                setFinderClearTrigger((n) => n + 1)
                            }}
                            onCancel={() => setCreatePersonName(null)}
                        />
                    )}
                </DialogContent>
            </Dialog>
            <Dialog
                open={showPeopleDialog}
                onClose={() => setShowPeopleDialog(false)}
                fullScreen
            >
                <DialogTitle>Add People to Entry</DialogTitle>
                <DialogContent>
                    {/* Staged people — always visible so the layout doesn't jump */}
                    <Box
                        sx={{
                            mb: 2,
                            p: 1.5,
                            borderRadius: 1,
                            bgcolor: 'primary.50',
                            border: '1px solid',
                            borderColor: 'primary.100',
                            minHeight: 56,
                        }}
                    >
                        <Typography
                            variant={'caption'}
                            color={'text.secondary'}
                            sx={{
                                display: 'block',
                                mb: 1,
                                fontWeight: 600,
                                letterSpacing: 0.5,
                                textTransform: 'uppercase',
                            }}
                        >
                            On this entry {entryPeople.length > 0 && `· ${entryPeople.length}`}
                        </Typography>
                        {entryPeople.length === 0 ? (
                            <Typography
                                variant={'body2'}
                                color={'text.disabled'}
                                sx={{ fontStyle: 'italic' }}
                            >
                                No one added yet
                            </Typography>
                        ) : (
                            <Stack
                                direction={'row'}
                                sx={{ flexWrap: 'wrap', gap: 1 }}
                            >
                                {entryPeople.map((p) => (
                                    <Chip
                                        key={p.id}
                                        avatar={<PersonAvatar person={p} />}
                                        label={personLabel(p)}
                                        sx={{
                                            bgcolor: 'rgba(var(--mui-palette-success-mainChannel) / 0.14)',
                                            color: 'success.main',
                                            '& .MuiChip-deleteIcon': { color: 'success.main' },
                                        }}
                                        onDelete={() => removePerson(p.id)}
                                    />
                                ))}
                            </Stack>
                        )}
                    </Box>

                    <Divider sx={{ mb: 2 }} />

                    <Grid2
                        container
                        spacing={3}
                        sx={{ alignItems: 'flex-start' }}
                    >
                        {/* Left panel: people already on this case */}
                        <Grid2 size={{ xs: 12, sm: 4, md: 3 }}>
                            <Box
                                sx={{
                                    p: 1.5,
                                    borderRadius: 1,
                                    bgcolor: 'app.surfaceTint',
                                    border: '1px solid',
                                    borderColor: 'divider',
                                    height: '100%',
                                }}
                            >
                                <Typography
                                    variant={'subtitle2'}
                                    sx={{ mb: 0.25 }}
                                >
                                    People On This Case
                                </Typography>
                                <Typography
                                    variant={'caption'}
                                    color={'text.secondary'}
                                    sx={{ display: 'block', mb: 1.5 }}
                                >
                                    Click to add person to this entry
                                </Typography>
                                {casePeopleNotStaged.length === 0 ? (
                                    <Typography
                                        variant={'body2'}
                                        color={'text.secondary'}
                                        sx={{ fontStyle: 'italic' }}
                                    >
                                        {entryPeople.length > 0 && casePeopleRes.data?.length === entryPeople.length
                                            ? 'Everyone is already added.'
                                            : 'No one on this case yet.'}
                                    </Typography>
                                ) : (
                                    <Stack
                                        spacing={1}
                                        sx={{ alignItems: 'flex-start' }}
                                    >
                                        {casePeopleNotStaged.map((p) => (
                                            <Chip
                                                key={p.id}
                                                avatar={<PersonAvatar person={p} />}
                                                label={personLabel(p)}
                                                variant={'outlined'}
                                                onClick={() => addPerson(p)}
                                            />
                                        ))}
                                    </Stack>
                                )}
                            </Box>
                        </Grid2>

                        {/* Right panel: search or create */}
                        <Grid2 size={{ xs: 12, sm: 8, md: 9 }}>
                            <Typography
                                variant={'subtitle2'}
                                sx={{ mb: 0.25 }}
                            >
                                Find or create a person
                            </Typography>
                            <Typography
                                variant={'caption'}
                                color={'text.secondary'}
                                sx={{ display: 'block', mb: 1.5 }}
                            >
                                Enter the exact name and salt phrase used when the person was created
                            </Typography>
                            <PersonFinder
                                embedded
                                onSelect={addPerson}
                                onCreateRequest={(name) => setCreatePersonName(name)}
                                clearTrigger={finderClearTrigger}
                            />
                        </Grid2>
                    </Grid2>
                </DialogContent>

                <DialogActions>
                    <Button
                        variant={'contained'}
                        onClick={() => setShowPeopleDialog(false)}
                    >
                        Done
                    </Button>
                </DialogActions>
            </Dialog>

            <Box sx={{ minHeight: '100%', bgcolor: entryWorkspace.background, color: entryWorkspace.ink }}>
                <Box
                    component="header"
                    sx={{
                        color: 'var(--mui-palette-app-headerText)',
                        background:
                            'linear-gradient(135deg, var(--mui-palette-app-headerStart) 0%, var(--mui-palette-app-headerEnd) 100%)',
                        borderBottom: '1px solid var(--mui-palette-app-headerBorder)',
                        boxShadow: '0 8px 22px var(--mui-palette-app-shadow)',
                    }}
                >
                    <Box
                        sx={{
                            width: '100%',
                            boxSizing: 'border-box',
                            px: pagePadding,
                            pt: pagePadding,
                            pb: 2.5,
                            display: 'flex',
                            flexDirection: { xs: 'column', sm: 'row' },
                            alignItems: { xs: 'stretch', sm: 'center' },
                            justifyContent: 'space-between',
                            gap: 1.5,
                        }}
                    >
                        <Box>
                            <Button
                                startIcon={<ArrowBack />}
                                onClick={() => navigate(`/case/${caseId}`)}
                                sx={{
                                    px: 0.25,
                                    py: 0.2,
                                    mb: 0.3,
                                    color: 'var(--mui-palette-primary-light)',
                                    textTransform: 'none',
                                    fontSize: '0.8rem',
                                    fontWeight: 700,
                                    '&:hover': {
                                        color: 'var(--mui-palette-app-headerText)',
                                        bgcolor: 'var(--mui-palette-app-headerHover)',
                                    },
                                }}
                            >
                                {caseRes.data?.name ?? 'Back to case'}
                            </Button>
                            <Typography
                                variant="h4"
                                component="h1"
                                sx={{ ...pageTitleStyle, color: 'var(--mui-palette-app-headerText)' }}
                            >
                                {isEditing ? 'Edit case note' : 'New case note'}
                            </Typography>
                        </Box>
                        <Stack
                            direction="row"
                            spacing={1}
                            sx={{ alignSelf: { xs: 'stretch', sm: 'center' } }}
                        >
                            <Button
                                variant="outlined"
                                onClick={() => navigate(`/case/${caseId}`)}
                                disabled={isSaving}
                                sx={{
                                    flex: { xs: 1, sm: 'initial' },
                                    color: 'var(--mui-palette-app-headerText)',
                                    borderColor: 'var(--mui-palette-secondary-main)',
                                    textTransform: 'none',
                                    fontWeight: 700,
                                    '&:hover': {
                                        color: 'var(--mui-palette-app-headerText)',
                                        borderColor: 'var(--mui-palette-app-headerMuted)',
                                        bgcolor: 'var(--mui-palette-app-headerHover)',
                                    },
                                }}
                            >
                                Cancel
                            </Button>
                            <Button
                                variant="contained"
                                startIcon={<SaveOutlined />}
                                onClick={save}
                                disabled={
                                    isSaving ||
                                    !caseRes.data?.organizationId ||
                                    Boolean(
                                        !notesLocked &&
                                        (isEditing ? changeNoteProtection || notesNeedProtection : notes) &&
                                        notePhrase.phrase === null,
                                    )
                                }
                                sx={{
                                    flex: { xs: 1, sm: 'initial' },
                                    color: 'var(--mui-palette-primary-contrastText)',
                                    bgcolor: entryWorkspace.purple,
                                    textTransform: 'none',
                                    fontWeight: 700,
                                    '&:hover': {
                                        color: 'var(--mui-palette-primary-contrastText)',
                                        bgcolor: entryWorkspace.purpleDark,
                                    },
                                }}
                            >
                                {isSaving ? 'Saving…' : isEditing ? 'Save changes' : 'Save entry'}
                            </Button>
                        </Stack>
                    </Box>
                </Box>

                <Box
                    component="main"
                    sx={{
                        width: '100%',
                        boxSizing: 'border-box',
                        p: pagePadding,
                        display: 'grid',
                        gridTemplateColumns: { xs: 'minmax(0, 1fr)', md: 'minmax(0, 1.45fr) minmax(300px, 0.72fr)' },
                        gap: 2.5,
                        alignItems: 'start',
                    }}
                >
                    <Paper
                        elevation={0}
                        sx={{
                            bgcolor: entryWorkspace.paper,
                            color: entryWorkspace.ink,
                            border: `1px solid ${entryWorkspace.border}`,
                            borderRadius: 3,
                            overflow: 'hidden',
                        }}
                    >
                        <Box sx={{ p: { xs: 2, sm: 3 } }}>
                            <Box
                                sx={{
                                    mb: 1.5,
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'space-between',
                                    flexWrap: 'wrap',
                                    gap: 1,
                                }}
                            >
                                <Box>
                                    <Typography
                                        variant="h6"
                                        sx={{ color: entryWorkspace.ink, fontWeight: 700 }}
                                    >
                                        Notes
                                    </Typography>
                                    <Typography
                                        variant="body2"
                                        sx={{ color: entryWorkspace.muted }}
                                    >
                                        Capture the interaction while it is fresh.
                                    </Typography>
                                </Box>
                                <Stack
                                    direction="row"
                                    spacing={0.75}
                                    sx={{ alignItems: 'center', color: entryWorkspace.tealDark }}
                                >
                                    <LockOutlined sx={{ fontSize: 17 }} />
                                    <Typography
                                        variant="body2"
                                        sx={{ fontWeight: 650 }}
                                    >
                                        Encrypted when saved
                                    </Typography>
                                </Stack>
                            </Box>
                            {notesLocked ? (
                                <Box
                                    sx={{
                                        minHeight: 180,
                                        display: 'grid',
                                        placeItems: 'center',
                                        border: '1px solid',
                                        borderColor: entryWorkspace.border,
                                        borderRadius: 2,
                                        bgcolor: entryWorkspace.tealPale,
                                    }}
                                >
                                    <Stack
                                        spacing={1}
                                        sx={{ alignItems: 'center', textAlign: 'center', p: 3 }}
                                    >
                                        <Typography
                                            variant="body2"
                                            sx={{ color: entryWorkspace.muted }}
                                        >
                                            Unlock this note to edit its text or change the phrase used to protect it.
                                        </Typography>
                                        <ProtectedText
                                            stored={storedNotes}
                                            organizationId={caseRes.data?.organizationId ?? ''}
                                            emptyText="No notes recorded."
                                            onDecrypted={(plaintext, phraseUsed) => {
                                                setNotes(plaintext)
                                                setOriginalNotes(plaintext)
                                                setUnlockPhrase(phraseUsed)
                                                setNotesLocked(false)
                                            }}
                                        />
                                    </Stack>
                                </Box>
                            ) : (
                                <>
                                    <TextField
                                        aria-label="Entry notes"
                                        value={notes}
                                        onChange={(event) => setNotes(event.target.value)}
                                        multiline
                                        minRows={12}
                                        fullWidth
                                        placeholder="Record the interaction, options discussed, and any planned follow-up…"
                                        sx={fieldStyle}
                                    />
                                    <Box sx={{ mt: 1.5 }}>
                                        {isEditing ? (
                                            notesNeedProtection ? (
                                                <Stack spacing={1.25}>
                                                    <Alert severity="warning">
                                                        This text was not previously protected. Choose how to protect it
                                                        before saving; it will not be stored as plaintext.
                                                    </Alert>
                                                    <PhraseSourceControl
                                                        source={notePhrase.source}
                                                        onSourceChange={notePhrase.setSource}
                                                        customPhrase={notePhrase.customPhrase}
                                                        onCustomPhraseChange={notePhrase.setCustomPhrase}
                                                        purpose="encrypt"
                                                    />
                                                </Stack>
                                            ) : (
                                                <Stack spacing={1.25}>
                                                    <Typography
                                                        variant="caption"
                                                        sx={{ color: entryWorkspace.muted }}
                                                    >
                                                        Saving keeps the note’s existing protection. Its phrase changes
                                                        only if you explicitly choose to replace it.
                                                    </Typography>
                                                    {!changeNoteProtection ? (
                                                        <Button
                                                            variant="outlined"
                                                            size="small"
                                                            onClick={() => setChangeNoteProtection(true)}
                                                            sx={{ alignSelf: 'flex-start' }}
                                                        >
                                                            Change protection phrase
                                                        </Button>
                                                    ) : (
                                                        <>
                                                            <Alert severity="warning">
                                                                Changing this phrase replaces the only phrase that can
                                                                recover this note. Confirm it carefully; exact spaces
                                                                count.
                                                            </Alert>
                                                            <PhraseSourceControl
                                                                source={notePhrase.source}
                                                                onSourceChange={notePhrase.setSource}
                                                                customPhrase={notePhrase.customPhrase}
                                                                onCustomPhraseChange={notePhrase.setCustomPhrase}
                                                                purpose="encrypt"
                                                            />
                                                            <Button
                                                                size="small"
                                                                onClick={() => setChangeNoteProtection(false)}
                                                                sx={{ alignSelf: 'flex-start' }}
                                                            >
                                                                Keep existing protection
                                                            </Button>
                                                        </>
                                                    )}
                                                </Stack>
                                            )
                                        ) : (
                                            <PhraseSourceControl
                                                source={notePhrase.source}
                                                onSourceChange={notePhrase.setSource}
                                                customPhrase={notePhrase.customPhrase}
                                                onCustomPhraseChange={notePhrase.setCustomPhrase}
                                                purpose="encrypt"
                                            />
                                        )}
                                    </Box>
                                </>
                            )}
                        </Box>

                        <Divider sx={{ borderColor: entryWorkspace.border }} />

                        <Box sx={{ p: { xs: 2, sm: 3 } }}>
                            <Box
                                sx={{
                                    mb: entryPeople.length ? 1.5 : 0,
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'space-between',
                                    flexWrap: 'wrap',
                                    gap: 1.5,
                                }}
                            >
                                <Box>
                                    <Typography
                                        variant="h6"
                                        sx={{ color: entryWorkspace.ink, fontWeight: 700 }}
                                    >
                                        People
                                    </Typography>
                                    <Typography
                                        variant="body2"
                                        sx={{ color: entryWorkspace.muted }}
                                    >
                                        {entryPeople.length
                                            ? `${entryPeople.length} associated with this entry`
                                            : 'No people associated with this entry.'}
                                    </Typography>
                                </Box>
                                <Button
                                    variant="outlined"
                                    startIcon={<PersonAddOutlined />}
                                    onClick={() => setShowPeopleDialog(true)}
                                    sx={{
                                        color: entryWorkspace.teal,
                                        borderColor: entryWorkspace.borderStrong,
                                        textTransform: 'none',
                                        fontWeight: 700,
                                        '&:hover': {
                                            borderColor: entryWorkspace.teal,
                                            bgcolor: entryWorkspace.tealPale,
                                        },
                                    }}
                                >
                                    {isEditing ? 'Manage people' : 'Add people'}
                                </Button>
                            </Box>
                            {!!entryPeople.length && (
                                <Stack
                                    direction="row"
                                    sx={{ flexWrap: 'wrap', gap: 0.75 }}
                                >
                                    {entryPeople.map((person) => (
                                        <Chip
                                            key={person.id}
                                            avatar={<PersonAvatar person={person} />}
                                            label={personLabel(person)}
                                            onDelete={() => removePerson(person.id)}
                                            sx={{
                                                color: entryWorkspace.tealDark,
                                                bgcolor: entryWorkspace.tealPale,
                                                '& .MuiChip-deleteIcon': { color: entryWorkspace.teal },
                                            }}
                                        />
                                    ))}
                                </Stack>
                            )}
                        </Box>
                    </Paper>

                    <Paper
                        component="aside"
                        elevation={0}
                        sx={{
                            bgcolor: entryWorkspace.paper,
                            color: entryWorkspace.ink,
                            border: `1px solid ${entryWorkspace.border}`,
                            borderRadius: 3,
                            overflow: 'hidden',
                            position: { md: 'sticky' },
                            top: { md: 24 },
                        }}
                    >
                        <Box sx={{ p: { xs: 2, sm: 2.5 } }}>
                            <Typography
                                variant="h6"
                                sx={{ color: entryWorkspace.ink, fontWeight: 700, mb: 0.25 }}
                            >
                                Entry details
                            </Typography>
                            <Typography
                                variant="body2"
                                sx={{ color: entryWorkspace.muted, mb: 2 }}
                            >
                                When and how the interaction occurred.
                            </Typography>
                            <Stack spacing={2}>
                                <TextField
                                    type="date"
                                    value={eventDate}
                                    onChange={(event) => setEventDate(event.target.value)}
                                    label="Event date"
                                    fullWidth
                                    slotProps={{ inputLabel: { shrink: true } }}
                                    sx={fieldStyle}
                                />
                                <TextField
                                    type="number"
                                    label="Duration (minutes)"
                                    value={duration}
                                    onChange={(event) => setDuration(Number(event.target.value))}
                                    fullWidth
                                    slotProps={{ htmlInput: { min: 0, step: 1 } }}
                                    sx={fieldStyle}
                                />
                            </Stack>
                        </Box>

                        <Divider sx={{ borderColor: entryWorkspace.border }} />

                        <ChoiceTiles
                            label="Method"
                            value={medium}
                            onChange={setMedium}
                            items={mediums.items}
                        />

                        <Divider sx={{ borderColor: entryWorkspace.border }} />

                        <ChoiceTiles
                            label="Priority"
                            value={entryPriority}
                            onChange={setEntryPriority}
                            items={priorities.items}
                        />
                    </Paper>
                </Box>
            </Box>
        </Box>
    )
}

function ChoiceTiles(props: {
    label: string
    value: string
    onChange: (value: string) => void
    items: { id: string; name: string }[]
}) {
    const { label, value, onChange, items } = props

    return (
        <Box sx={{ p: { xs: 2, sm: 2.5 } }}>
            <Typography sx={{ color: entryWorkspace.ink, fontWeight: 700, mb: 1.25 }}>{label}</Typography>
            {items.length ? (
                <RadioGroup
                    value={value}
                    onChange={(event) => onChange(event.target.value)}
                    sx={{ gap: 0.75 }}
                >
                    {items.map((item) => {
                        const selected = item.name === value
                        return (
                            <FormControlLabel
                                key={item.id}
                                value={item.name}
                                control={
                                    <Radio
                                        size="small"
                                        sx={{
                                            color: 'text.disabled',
                                            '&.Mui-checked': { color: entryWorkspace.teal },
                                        }}
                                    />
                                }
                                label={item.name}
                                sx={{
                                    m: 0,
                                    px: 1,
                                    py: 0.25,
                                    width: '100%',
                                    boxSizing: 'border-box',
                                    color: selected ? entryWorkspace.tealDark : entryWorkspace.ink,
                                    bgcolor: selected ? entryWorkspace.tealPale : entryWorkspace.paper,
                                    border: '1px solid',
                                    borderColor: selected ? entryWorkspace.teal : entryWorkspace.borderStrong,
                                    borderRadius: 2,
                                    '& .MuiFormControlLabel-label': { fontWeight: selected ? 700 : 500 },
                                }}
                            />
                        )
                    })}
                </RadioGroup>
            ) : (
                <Typography
                    variant="body2"
                    sx={{ color: entryWorkspace.muted, fontStyle: 'italic' }}
                >
                    No {label.toLowerCase()} options configured.
                </Typography>
            )}
        </Box>
    )
}
