import {
    Box,
    Button,
    Chip,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    FormControlLabel,
    Radio,
    RadioGroup,
    Stack,
    TextField,
    Typography,
} from '@mui/material'
import { useState } from 'react'
import { RoundedContainer } from '../components/RoundedContainer'
import { useNavigate, useParams } from 'react-router-dom'
import { useGetter } from '../tools/db_tools/useGetter'
import { CaseType, PersonType } from '../types/majorTypes'
import { creator } from '../tools/db_tools/creator'
import { useUserId } from '../tools/useUserId'
import { PersonFinder } from '../components/PersonFinder'
import { RoundButton } from '../trusted-components/RoundButton'
import { Add } from '@mui/icons-material'
import React from 'react'
import Grid2 from '@mui/material/Grid'

/** Compact label for a Person chip — demographics only, no identity. */
function personLabel(p: PersonType): string {
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
    const [duration, setDuration] = useState(30)
    const [eventDate, setEventDate] = useState(() => new Date().toISOString().slice(0, 10))
    const ombudsId = useUserId()
    const [showPeopleDialog, setShowPeopleDialog] = React.useState(false)

    const [medium, setMedium] = useState('inPerson')
    const entryMediums = [
        { value: 'inPerson', label: 'In Person' },
        { value: 'phone', label: 'Phone' },
        { value: 'video', label: 'Videoconference' },
        { value: 'email', label: 'Email' },
        { value: 'other', label: 'Other' },
    ]
    const [entryPriority, setEntryPriority] = useState('primary')

    // People staged for this entry. Kept in component state until the entry is
    // saved; then we POST add_entry_person for each.
    const [entryPeople, setEntryPeople] = useState<PersonType[]>([])

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
            notes,
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
        navigate(`/case/${caseId}`)
    }

    // People on the case but not yet staged for this entry.
    const casePeopleNotStaged = (casePeopleRes.data ?? []).filter(
        (cp) => !entryPeople.some((ep) => ep.id === cp.id),
    )

    return (
        <Box>
            <Dialog
                open={showPeopleDialog}
                onClose={() => setShowPeopleDialog(false)}
                fullScreen
            >
                <DialogTitle>Add People to Entry</DialogTitle>
                <DialogContent sx={{ height: '70vh' }}>
                    {entryPeople.length > 0 && (
                        <Box sx={{ mb: 2 }}>
                            <Typography
                                variant={'subtitle2'}
                                sx={{ mb: 1 }}
                            >
                                On this entry
                            </Typography>
                            <Stack
                                direction={'row'}
                                spacing={1}
                                sx={{ flexWrap: 'wrap', gap: 1 }}
                            >
                                {entryPeople.map((p) => (
                                    <Chip
                                        key={p.id}
                                        label={personLabel(p)}
                                        onDelete={() => removePerson(p.id)}
                                    />
                                ))}
                            </Stack>
                        </Box>
                    )}
                    <Grid2
                        container
                        spacing={2}
                        sx={{ alignItems: 'stretch' }}
                    >
                        <Grid2
                            sx={{ display: 'flex' }}
                            size={{ xs: 12, sm: 4, md: 3 }}
                        >
                            <Box
                                sx={{
                                    p: 1,
                                    border: '1px solid lightgray',
                                    borderRadius: 1,
                                    flex: 1,
                                    width: '100%',
                                }}
                            >
                                <Typography
                                    variant={'h6'}
                                    sx={{ mb: 1 }}
                                >
                                    Already on this case
                                </Typography>
                                {casePeopleNotStaged.length === 0 && (
                                    <Typography
                                        variant={'body2'}
                                        color={'text.secondary'}
                                    >
                                        None to add.
                                    </Typography>
                                )}
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
                            </Box>
                        </Grid2>

                        <Grid2
                            sx={{ display: 'flex' }}
                            size={{ xs: 12, sm: 8, md: 9 }}
                        >
                            <Box sx={{ flex: 1, width: '100%' }}>
                                <PersonFinder onSelect={addPerson} />
                            </Box>
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
            <Stack spacing={2}>
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
                            <FormControlLabel
                                value={'primary'}
                                control={<Radio />}
                                label={'Primary'}
                            />
                            <FormControlLabel
                                value={'secondary'}
                                control={<Radio />}
                                label={'Secondary'}
                            />
                        </RadioGroup>
                    </RoundedContainer>
                    <RoundedContainer title={'Entry Method'}>
                        <RadioGroup
                            value={medium}
                            onChange={(evt) => setMedium(evt.target.value)}
                        >
                            {entryMediums.map((type) => (
                                <FormControlLabel
                                    key={type.value}
                                    value={type.value}
                                    control={<Radio />}
                                    label={type.label}
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
