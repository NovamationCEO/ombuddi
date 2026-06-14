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
    Radio,
    RadioGroup,
    Stack,
    TextField,
    Typography,
} from '@mui/material'
import { useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { RoundedContainer } from '../components/RoundedContainer'
import { useNavigate, useParams } from 'react-router-dom'
import { useGetter } from '../tools/db_tools/useGetter'
import { CaseType, PersonType } from '../types/majorTypes'
import { creator } from '../tools/db_tools/creator'
import { useUserId } from '../tools/useUserId'
import { PersonFinder } from '../components/PersonFinder'
import { PersonForm } from '../components/AddPerson/PersonForm'
import { RoundButton } from '../trusted-components/RoundButton'
import { Add } from '@mui/icons-material'
import React from 'react'
import Grid2 from '@mui/material/Grid'
import { usePicklists } from '../tools/usePicklists'
import { useSessionSalt } from '../libraries/useSessionSalt'
import { encryptNotes } from '../tools/notesCrypto'

/** Compact label for a Person chip — demographics only, no identity. */
function personLabel(p: PersonType): string {
    if (p.isPublic && p.publicName) return p.publicName
    const parts = [p.primaryRole, p.generation, p.gender].filter(
        (s) => s && s !== 'unknown' && s !== 'N/A',
    )
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
    const ombudsId = useUserId()
    const sessionSalt = useSessionSalt((s) => s.sessionSalt)
    const [showPeopleDialog, setShowPeopleDialog] = React.useState(false)

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
        setEntryPeople((prev) =>
            prev.some((p) => p.id === person.id) ? prev : [...prev, person],
        )
    }

    function removePerson(personId: string) {
        setEntryPeople((prev) => prev.filter((p) => p.id !== personId))
    }

    async function save() {
        const organizationId = caseRes.data?.organizationId
        if (!organizationId) return
        const storedNotes = notes
            ? await encryptNotes(notes, sessionSalt ?? '', organizationId)
            : ''
        const payload = {
            caseId,
            ombudsId,
            // Entry's org is denormalized from the parent case so every entry
            // query can scope on it without joining; sourcing from caseRes
            // here makes the invariant case.org_id === entry.org_id explicit.
            organizationId,
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
    }

    // People on the case but not yet staged for this entry.
    const casePeopleNotStaged = (casePeopleRes.data ?? []).filter(
        (cp) => !entryPeople.some((ep) => ep.id === cp.id),
    )

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
                            sx={{ display: 'block', mb: 1, fontWeight: 600, letterSpacing: 0.5, textTransform: 'uppercase' }}
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
            <Stack spacing={2} sx={{ p: 1 }}>
                <Box sx={{ display: 'flex' }}>
                    <Box>
                        <Typography variant={'h5'}>
                            Add Entry to Case: <em>{caseRes.data?.name}</em>
                        </Typography>
                    </Box>
                    <Stack
                        spacing={2}
                        direction={'row'}
                        sx={{ display: 'flex', flex: 1, justifyContent: 'flex-end' }}
                    >
                        <Button
                            variant={'outlined'}
                            onClick={() => navigate(`/case/${caseId}`)}
                            sx={{ width: '150px' }}
                        >
                            Cancel
                        </Button>
                        <Button
                            variant={'contained'}
                            onClick={save}
                            sx={{ width: '150px' }}
                        >
                            Save
                        </Button>
                    </Stack>
                </Box>

                <Stack
                    spacing={2}
                    direction={'row'}
                >
                    <RoundedContainer title={'Basic Info'}>
                        <Stack spacing={2}>
                            <TextField
                                type={'date'}
                                value={eventDate}
                                onChange={(evt) => setEventDate(evt.target.value)}
                                label={'Event Date'}
                                fullWidth
                            />
                            <TextField
                                type={'number'}
                                label={'Duration (minutes)'}
                                value={duration}
                                onChange={(evt) => setDuration(Number(evt.target.value))}
                                fullWidth
                                slotProps={{ htmlInput: { min: 0, step: 15 } }}
                            />
                        </Stack>
                    </RoundedContainer>
                    <RoundedContainer title={'Entry Priority'}>
                        <RadioGroup
                            value={entryPriority}
                            onChange={(evt) => setEntryPriority(evt.target.value)}
                        >
                            {priorities.items.map((item) => (
                                <FormControlLabel
                                    key={item.id}
                                    value={item.name}
                                    control={<Radio />}
                                    label={item.name}
                                />
                            ))}
                        </RadioGroup>
                    </RoundedContainer>
                    <RoundedContainer title={'Entry Method'}>
                        <RadioGroup
                            value={medium}
                            onChange={(evt) => setMedium(evt.target.value)}
                        >
                            {mediums.items.map((item) => (
                                <FormControlLabel
                                    key={item.id}
                                    value={item.name}
                                    control={<Radio />}
                                    label={item.name}
                                />
                            ))}
                        </RadioGroup>
                    </RoundedContainer>

                    <RoundedContainer title={'People'}>
                        <Stack
                            direction={'row'}
                            sx={{ flexWrap: 'wrap', gap: 1, mb: 4 }}
                        >
                            {entryPeople.length === 0 && (
                                <Typography
                                    variant={'body2'}
                                    color={'text.secondary'}
                                >
                                    None added yet.
                                </Typography>
                            )}
                            {entryPeople.map((p) => (
                                <Chip
                                    key={p.id}
                                    label={personLabel(p)}
                                    onDelete={() => removePerson(p.id)}
                                />
                            ))}
                        </Stack>
                        <Box sx={{ position: 'absolute', bottom: 8, right: 8 }}>
                            <RoundButton
                                bgcolor={'white'}
                                size={27}
                                onClick={() => setShowPeopleDialog(true)}
                            >
                                <Add fontSize={'small'} />
                            </RoundButton>
                        </Box>
                    </RoundedContainer>
                </Stack>
                <Box>
                    <TextField
                        label={'Notes'}
                        value={notes}
                        onChange={(evt) => setNotes(evt.target.value)}
                        multiline
                        rows={6}
                        fullWidth
                    />
                </Box>
            </Stack>
        </Box>
    )
}
