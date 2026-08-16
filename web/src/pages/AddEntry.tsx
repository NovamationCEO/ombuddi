import {
    Box,
    Button,
    Chip,
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
import { CaseType, PersonType } from '../types/majorTypes'
import { creator } from '../tools/db_tools/creator'
import { PersonFinder } from '../components/PersonFinder'
import { PersonForm } from '../components/AddPerson/PersonForm'
import { Add, ArrowBack, LockOutlined, PersonAddOutlined, SaveOutlined } from '@mui/icons-material'
import React from 'react'
import Grid2 from '@mui/material/Grid'
import { usePicklists } from '../tools/usePicklists'
import { useSessionSalt } from '../libraries/useSessionSalt'
import { encryptNotes } from '../tools/notesCrypto'

const entryWorkspace = {
    background: '#F2F6F5',
    paper: '#FFFFFF',
    ink: '#183337',
    muted: '#647578',
    teal: '#2F6668',
    tealDark: '#234E51',
    tealPale: '#EAF3F2',
    border: '#D7E1DF',
    purple: '#875C9B',
    purpleDark: '#70477F',
} as const

const fieldStyle = {
    '& .MuiInputLabel-root': { color: '#536A6D' },
    '& .MuiInputLabel-root.Mui-focused': { color: entryWorkspace.teal },
    '& .MuiOutlinedInput-root': {
        color: entryWorkspace.ink,
        bgcolor: entryWorkspace.paper,
        '& fieldset': { borderColor: '#AEBFBD' },
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
    const { caseId } = useParams()
    const caseRes = useGetter<CaseType>(['get_case_by_id', caseId])
    const casePeopleRes = useGetter<PersonType[]>(['get_persons_by_case_id', caseId])
    const [notes, setNotes] = useState('')
    const navigate = useNavigate()
    const queryClient = useQueryClient()
    const [duration, setDuration] = useState(30)
    const [eventDate, setEventDate] = useState(() => new Date().toISOString().slice(0, 10))
    const sessionSalt = useSessionSalt((s) => s.sessionSalt)
    const [showPeopleDialog, setShowPeopleDialog] = React.useState(false)
    const [isSaving, setIsSaving] = React.useState(false)

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

    // People staged for this entry. Kept in component state until the entry is
    // saved; then we POST add_entry_person for each.
    const [entryPeople, setEntryPeople] = useState<PersonType[]>([])

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

    async function save() {
        const organizationId = caseRes.data?.organizationId
        if (!organizationId || isSaving) return
        setIsSaving(true)
        try {
            const storedNotes = notes ? await encryptNotes(notes, sessionSalt ?? '', organizationId) : ''
            const payload = {
                caseId,
                date: eventDate,
                medium,
                duration,
                notes: storedNotes,
            }
            const created = await creator<{ id: string; success: boolean }>('add_entry', payload)
            const newEntryId = created?.id
            if (newEntryId && entryPeople.length > 0) {
                // Fan out the join inserts. If one fails the rest still run; the
                // entry itself is created either way. (Future: batch endpoint.)
                await Promise.all(
                    entryPeople.map((person) =>
                        creator<{ entryId: string; personId: string }>('add_entry_person', {
                            entryId: newEntryId,
                            personId: person.id,
                        }),
                    ),
                )
            }
            await queryClient.invalidateQueries({ queryKey: ['get_entries_by_case_id', caseId] })
            navigate(`/case/${caseId}`)
        } finally {
            setIsSaving(false)
        }
    }

    // People on the case but not yet staged for this entry.
    const casePeopleNotStaged = (casePeopleRes.data ?? []).filter((cp) => !entryPeople.some((ep) => ep.id === cp.id))

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
                                        label={personLabel(p)}
                                        sx={{
                                            bgcolor: '#d4edda',
                                            color: '#155724',
                                            '& .MuiChip-deleteIcon': { color: '#155724' },
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
                                    bgcolor: 'grey.100',
                                    border: '1px solid',
                                    borderColor: 'grey.200',
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
                                                label={personLabel(p)}
                                                variant={'outlined'}
                                                onClick={() => addPerson(p)}
                                                icon={<Add fontSize={'small'} />}
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
                        color: '#F3F2EC',
                        background: 'linear-gradient(135deg, #102D31 0%, #1F4B4F 100%)',
                        borderBottom: '1px solid rgba(202, 220, 218, 0.18)',
                        boxShadow: '0 8px 22px rgba(8, 31, 34, 0.14)',
                    }}
                >
                    <Box
                        sx={{
                            width: '100%',
                            maxWidth: 1480,
                            mx: 'auto',
                            boxSizing: 'border-box',
                            px: { xs: 2, sm: 3, lg: 4 },
                            py: { xs: 1.5, sm: 2 },
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
                                    color: '#C4A7D0',
                                    textTransform: 'none',
                                    fontSize: '0.8rem',
                                    fontWeight: 700,
                                    '&:hover': { color: '#FFFFFF', bgcolor: 'rgba(255, 255, 255, 0.06)' },
                                }}
                            >
                                {caseRes.data?.name ?? 'Back to case'}
                            </Button>
                            <Typography
                                variant="h4"
                                component="h1"
                                sx={{ color: '#FFFFFF', fontSize: { xs: '1.45rem', sm: '1.8rem' }, fontWeight: 700 }}
                            >
                                New case note
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
                                    color: '#E5F1EF',
                                    borderColor: '#8CB5B2',
                                    textTransform: 'none',
                                    fontWeight: 700,
                                    '&:hover': {
                                        color: '#FFFFFF',
                                        borderColor: '#C7DCDA',
                                        bgcolor: 'rgba(255, 255, 255, 0.08)',
                                    },
                                }}
                            >
                                Cancel
                            </Button>
                            <Button
                                variant="contained"
                                startIcon={<SaveOutlined />}
                                onClick={save}
                                disabled={isSaving || !caseRes.data?.organizationId}
                                sx={{
                                    flex: { xs: 1, sm: 'initial' },
                                    color: '#FFFFFF',
                                    bgcolor: entryWorkspace.purple,
                                    textTransform: 'none',
                                    fontWeight: 700,
                                    '&:hover': { color: '#FFFFFF', bgcolor: entryWorkspace.purpleDark },
                                }}
                            >
                                {isSaving ? 'Saving…' : 'Save entry'}
                            </Button>
                        </Stack>
                    </Box>
                </Box>

                <Box
                    component="main"
                    sx={{
                        width: '100%',
                        maxWidth: 1480,
                        mx: 'auto',
                        boxSizing: 'border-box',
                        p: { xs: 2, sm: 3, lg: 4 },
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
                                        borderColor: '#9FBBB8',
                                        textTransform: 'none',
                                        fontWeight: 700,
                                        '&:hover': {
                                            borderColor: entryWorkspace.teal,
                                            bgcolor: entryWorkspace.tealPale,
                                        },
                                    }}
                                >
                                    Add people
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
                                    slotProps={{ htmlInput: { min: 0, step: 15 } }}
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
                                            color: '#829593',
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
                                    borderColor: selected ? entryWorkspace.teal : '#BDCCCA',
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
