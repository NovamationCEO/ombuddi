import { pageLayoutStyle } from '../theme/pageLayout'
import { Box, Button, Chip, CircularProgress, MenuItem, Divider, Stack, TextField, Typography } from '@mui/material'
import { useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { useNavigate, useParams } from 'react-router-dom'
import { useGetter } from '../tools/db_tools/useGetter'
import { CaseType, EntryType, PersonType, EntryPersonType } from '../types/majorTypes'
import { creator } from '../tools/db_tools/creator'
import { updater } from '../tools/db_tools/updater'
import { deleter } from '../tools/db_tools/deleter'
import { EntryPeopleDialog } from '../components/EntryPeopleDialog'
import { ArrowBack, LockOutlined, LockOpenOutlined, PersonAddOutlined, SaveOutlined } from '@mui/icons-material'
import React from 'react'
import { usePicklists } from '../tools/usePicklists'
import { encryptNotes, isEncrypted } from '../tools/notesCrypto'
import { NoteEncryptionDialog, type NoteEncryptionChoice } from '../components/NoteEncryptionDialog'
import { PersonAvatar } from '../components/PersonAvatar'
import { ProtectedText } from '../components/ProtectedText'
import { useSnack } from '../libraries/useSnack'
import { entryRoleLabel } from '../tools/entryRoles'
import { entryPersonChanges } from '../tools/entryPersonChanges'
import { calendarDateInputValue, localCalendarDateInputValue } from '../tools/calendarDate'
import { useCurrentOmbuds } from '../tools/useCurrentOmbuds'
import { ThemeProvider } from '@mui/material/styles'
import { caseFolderTheme } from '../theme/caseFolderTheme'
import '../theme/caseFolder.css'
import './AddEntry.css'

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
    const existingEntryPeopleRes = useGetter<EntryPersonType[]>(['get_persons_by_entry_id', entryId])
    const currentOmbudsRes = useCurrentOmbuds(isEditing)
    const [notes, setNotes] = useState('')
    const [storedNotes, setStoredNotes] = useState('')
    const [originalNotes, setOriginalNotes] = useState('')
    const [notesLocked, setNotesLocked] = useState(false)
    const [entryInitialized, setEntryInitialized] = useState(!isEditing)
    const navigate = useNavigate()
    const queryClient = useQueryClient()
    const setSnack = useSnack((state) => state.setSnack)
    const [duration, setDuration] = useState(30)
    const [eventDate, setEventDate] = useState(() => localCalendarDateInputValue())
    const [encryptionChoice, setEncryptionChoice] = useState<NoteEncryptionChoice | null>(null)
    const [saveAfterChoice, setSaveAfterChoice] = useState(false)
    const [protectionOpen, setProtectionOpen] = useState(false)
    const [showPeopleDialog, setShowPeopleDialog] = React.useState(false)
    const [isSaving, setIsSaving] = React.useState(false)
    const initializedEntryId = React.useRef<string | null>(null)
    const originalPeople = React.useRef<EntryPersonType[]>([])

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
    const [entryPeople, setEntryPeople] = useState<EntryPersonType[]>([])

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
        setNotesLocked(encrypted)
        setEncryptionChoice(null)
        setEntryPeople(people)
        originalPeople.current = people
        initializedEntryId.current = entryId
        setEntryInitialized(true)
    }, [caseId, entryId, entryRes.data, existingEntryPeopleRes.data, isEditing])

    function addPerson(person: PersonType) {
        setEntryPeople((prev) =>
            prev.some((p) => p.id === person.id) ? prev : [...prev, { ...person, entryRole: 'visitor' }],
        )
    }

    function removePerson(personId: string) {
        setEntryPeople((prev) => prev.filter((p) => p.id !== personId))
    }

    const needsEncryptionChoice = !isEditing || (!notesLocked && notes !== originalNotes)
    const encryptionOff =
        encryptionChoice?.mode === 'none' ||
        (encryptionChoice === null && isEditing && !isEncrypted(storedNotes) && !needsEncryptionChoice)

    async function save(choice = encryptionChoice) {
        const organizationId = caseRes.data?.organizationId
        if (!organizationId || isSaving) return
        if (needsEncryptionChoice && choice === null) {
            setSaveAfterChoice(true)
            setProtectionOpen(true)
            return
        }
        if (choice?.mode === 'encrypted' && !choice.phrase.length) return
        setIsSaving(true)
        try {
            // Preserve untouched/locked ciphertext. Plaintext is written only after
            // the user explicitly confirms that encryption should be turned off.
            let nextStoredNotes = storedNotes
            if (!notesLocked && choice !== null) {
                nextStoredNotes =
                    choice.mode === 'none' ? notes : await encryptNotes(notes, choice.phrase, organizationId)
            }
            const payload = {
                caseId,
                date: eventDate,
                medium,
                duration,
                notes: nextStoredNotes,
            }
            if (isEditing && entryId) {
                await updater('update_entry', { id: entryId, ...payload })
                const { additions, updates, removals } = entryPersonChanges(originalPeople.current, entryPeople)

                await Promise.all([
                    ...[...additions, ...updates].map((person) =>
                        creator('add_entry_person', {
                            entryId,
                            personId: person.id,
                            entryRole: person.entryRole ?? 'visitor',
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
                    personRoles: Object.fromEntries(
                        entryPeople.map((person) => [person.id, person.entryRole ?? 'visitor']),
                    ),
                })
            }
            await queryClient.invalidateQueries({ queryKey: ['reports'] })
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
            {showPeopleDialog && (
                <EntryPeopleDialog
                    people={entryPeople}
                    casePeople={casePeopleRes.data ?? []}
                    onAdd={addPerson}
                    onRemove={removePerson}
                    onRoleChange={(id, entryRole) =>
                        setEntryPeople((current) =>
                            current.map((person) => (person.id === id ? { ...person, entryRole } : person)),
                        )
                    }
                    onClose={() => setShowPeopleDialog(false)}
                    onUpdate={(person) =>
                        setEntryPeople((current) =>
                            current.map((item) =>
                                item.id === person.id ? { ...person, entryRole: item.entryRole } : item,
                            ),
                        )
                    }
                />
            )}
            <Box sx={pageLayoutStyle}>
                <ThemeProvider theme={caseFolderTheme}>
                    <Box
                        component="main"
                        className="case-folder case-note-folder"
                        aria-labelledby="case-note-title"
                    >
                        <Box className="case-folder-tab">Case note</Box>
                        <Box className="case-folder-body">
                            <Box className="case-folder-paper case-note-paper">
                                <Box component="header">
                                    <Button
                                        startIcon={<ArrowBack />}
                                        onClick={() => navigate(`/case/${caseId}`)}
                                        sx={{ px: 0, mb: 1, textAlign: 'left', overflowWrap: 'anywhere' }}
                                    >
                                        {caseRes.data?.name ?? 'Back to case'}
                                    </Button>
                                    <Typography
                                        component="h1"
                                        id="case-note-title"
                                        className="case-note-title"
                                    >
                                        {isEditing ? 'Edit case note' : 'New case note'}
                                    </Typography>
                                </Box>
                                <Box className="case-note-details">
                                    <TextField
                                        type="date"
                                        value={eventDate}
                                        onChange={(event) => setEventDate(event.target.value)}
                                        label="Event date"
                                        variant="standard"
                                        fullWidth
                                        disabled={isSaving}
                                        slotProps={{ inputLabel: { shrink: true } }}
                                    />
                                    <NoteChoice
                                        label="Method"
                                        value={medium}
                                        onChange={setMedium}
                                        items={mediums.items}
                                        disabled={isSaving}
                                    />
                                    <TextField
                                        type="number"
                                        label="Duration (minutes)"
                                        value={duration}
                                        onChange={(event) => setDuration(Number(event.target.value))}
                                        variant="standard"
                                        fullWidth
                                        disabled={isSaving}
                                        slotProps={{ htmlInput: { min: 0, step: 1 }, inputLabel: { shrink: true } }}
                                    />
                                </Box>
                                <Box
                                    className={`case-note-content${notesLocked ? '' : ' case-note-content-with-protection'}`}
                                >
                                    <Box
                                        component="section"
                                        aria-labelledby="note-writing-label"
                                        className="case-note-writing"
                                    >
                                        <Typography
                                            component="h2"
                                            id="note-writing-label"
                                            sx={{ fontSize: '0.9rem', fontWeight: 700, mb: 1.5 }}
                                        >
                                            Notes
                                        </Typography>
                                        {notesLocked ? (
                                            <Box className="case-note-locked">
                                                <LockOutlined sx={{ color: 'text.secondary', fontSize: 28 }} />
                                                <Typography
                                                    variant="body2"
                                                    color="text.secondary"
                                                >
                                                    Unlock this note to edit its text.
                                                </Typography>
                                                <ProtectedText
                                                    stored={storedNotes}
                                                    organizationId={caseRes.data?.organizationId ?? ''}
                                                    emptyText="No notes recorded."
                                                    unlockLabel="Unlock notes"
                                                    onDecrypted={(plaintext) => {
                                                        setNotes(plaintext)
                                                        setOriginalNotes(plaintext)
                                                        setNotesLocked(false)
                                                    }}
                                                />
                                            </Box>
                                        ) : (
                                            <TextField
                                                value={notes}
                                                onChange={(event) => setNotes(event.target.value)}
                                                multiline
                                                minRows={6}
                                                maxRows={12}
                                                fullWidth
                                                variant="standard"
                                                disabled={isSaving}
                                                placeholder="Record the interaction, options discussed, and any planned follow-up…"
                                                slotProps={{
                                                    input: { disableUnderline: true },
                                                    htmlInput: { 'aria-label': 'Entry notes' },
                                                }}
                                                sx={{
                                                    '& .MuiInputBase-root': {
                                                        p: 0,
                                                        lineHeight: 1.8,
                                                        alignItems: 'flex-start',
                                                    },
                                                }}
                                            />
                                        )}
                                    </Box>
                                    {!notesLocked && (
                                        <Box
                                            component="section"
                                            className="case-note-protection"
                                            aria-labelledby="note-protection-title"
                                        >
                                            <Typography
                                                component="h2"
                                                id="note-protection-title"
                                                sx={{ fontSize: '0.9rem', fontWeight: 700, mb: 1.5 }}
                                            >
                                                Encryption
                                            </Typography>
                                            <Stack
                                                spacing={1.5}
                                                sx={{ alignItems: 'flex-start' }}
                                            >
                                                <Stack
                                                    direction="row"
                                                    spacing={1}
                                                    sx={{ alignItems: 'center' }}
                                                >
                                                    {encryptionOff ? (
                                                        <LockOpenOutlined
                                                            sx={{ fontSize: 18, color: 'warning.main' }}
                                                        />
                                                    ) : (
                                                        <LockOutlined sx={{ fontSize: 18, color: 'text.secondary' }} />
                                                    )}
                                                    <Typography variant="body2">
                                                        {encryptionOff
                                                            ? 'Encryption off'
                                                            : encryptionChoice?.mode === 'encrypted'
                                                              ? 'Encryption phrase selected'
                                                              : needsEncryptionChoice
                                                                ? 'Choose encryption before saving'
                                                                : 'Encryption unchanged'}
                                                    </Typography>
                                                </Stack>
                                                <Button
                                                    size="small"
                                                    disabled={isSaving}
                                                    onClick={() => {
                                                        setSaveAfterChoice(false)
                                                        setProtectionOpen(true)
                                                    }}
                                                >
                                                    {needsEncryptionChoice && encryptionChoice === null
                                                        ? 'Choose Encryption Phrase'
                                                        : 'Change encryption'}
                                                </Button>
                                            </Stack>
                                        </Box>
                                    )}
                                </Box>
                                {protectionOpen && (
                                    <NoteEncryptionDialog
                                        choice={encryptionChoice}
                                        saveOnConfirm={saveAfterChoice}
                                        onClose={() => setProtectionOpen(false)}
                                        onConfirm={(choice) => {
                                            setEncryptionChoice(choice)
                                            setProtectionOpen(false)
                                            if (saveAfterChoice) void save(choice)
                                        }}
                                    />
                                )}
                                <Stack
                                    component="footer"
                                    direction="row"
                                    spacing={1}
                                    sx={{ justifyContent: 'flex-end', mt: 3 }}
                                >
                                    <Button
                                        onClick={() => navigate(`/case/${caseId}`)}
                                        disabled={isSaving}
                                    >
                                        Cancel
                                    </Button>
                                    <Button
                                        variant="contained"
                                        startIcon={<SaveOutlined />}
                                        onClick={() => void save()}
                                        disabled={isSaving || !caseRes.data?.organizationId}
                                    >
                                        {isSaving ? 'Saving…' : isEditing ? 'Save changes' : 'Save entry'}
                                    </Button>
                                </Stack>
                            </Box>
                            <Box
                                component="aside"
                                className="case-note-margin"
                                aria-label="People and priority"
                            >
                                <Box
                                    component="section"
                                    aria-labelledby="note-people-title"
                                >
                                    <Typography
                                        component="h2"
                                        id="note-people-title"
                                        sx={{ fontSize: '1rem', fontWeight: 700, mb: 1.5 }}
                                    >
                                        People
                                    </Typography>
                                    {entryPeople.length ? (
                                        <Stack
                                            spacing={1}
                                            sx={{ alignItems: 'flex-start', mb: 1 }}
                                        >
                                            {entryPeople.map((person) => (
                                                <Chip
                                                    key={person.id}
                                                    avatar={<PersonAvatar person={person} />}
                                                    label={`${personLabel(person)} · ${entryRoleLabel(person.entryRole)}`}
                                                    sx={{
                                                        maxWidth: '100%',
                                                        bgcolor: 'rgba(255,255,255,0.5)',
                                                        '& .MuiChip-label': {
                                                            whiteSpace: 'normal',
                                                            overflowWrap: 'anywhere',
                                                        },
                                                        height: 'auto',
                                                        minHeight: 36,
                                                        py: 0.5,
                                                    }}
                                                />
                                            ))}
                                        </Stack>
                                    ) : (
                                        <Typography
                                            variant="body2"
                                            color="text.secondary"
                                            sx={{ mb: 1 }}
                                        >
                                            No people added yet.
                                        </Typography>
                                    )}
                                    <Button
                                        startIcon={<PersonAddOutlined />}
                                        disabled={isSaving}
                                        onClick={() => setShowPeopleDialog(true)}
                                        sx={{ px: 0 }}
                                    >
                                        {isEditing ? 'Manage people' : 'Add people'}
                                    </Button>
                                </Box>
                                <Divider sx={{ my: 3, borderColor: '#ccbc9b' }} />
                                <NoteChoice
                                    label="Priority"
                                    value={entryPriority}
                                    onChange={setEntryPriority}
                                    items={priorities.items}
                                    disabled={isSaving}
                                />
                            </Box>
                        </Box>
                    </Box>
                </ThemeProvider>
            </Box>
        </Box>
    )
}

function NoteChoice({
    label,
    value,
    onChange,
    items,
    disabled,
}: {
    label: string
    value: string
    onChange: (value: string) => void
    items: { id: string; name: string }[]
    disabled: boolean
}) {
    // Preserve a saved value even when its organization picklist has changed.
    const options = [...new Set([...items.map((item) => item.name), ...(value ? [value] : [])])]
    return (
        <TextField
            select
            label={label}
            value={value}
            onChange={(event) => onChange(event.target.value)}
            variant="standard"
            fullWidth
            disabled={disabled || !options.length}
            slotProps={{ inputLabel: { shrink: true } }}
            helperText={options.length ? undefined : `No ${label.toLowerCase()} options configured.`}
        >
            {!value && (
                <MenuItem
                    value=""
                    disabled
                >
                    Choose {label.toLowerCase()}
                </MenuItem>
            )}
            {options.map((name) => (
                <MenuItem
                    key={name}
                    value={name}
                >
                    {name}
                </MenuItem>
            ))}
        </TextField>
    )
}
