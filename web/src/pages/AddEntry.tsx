import {
    Box,
    Button,
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
import { CaseType } from '../types/majorTypes'
import { creator } from '../tools/db_tools/creator'
import { useUserId } from '../tools/useUserId'
import { PersonFinder } from '../components/PersonFinder'
import { RoundButton } from '../trusted-components/RoundButton'
import { Add } from '@mui/icons-material'
import React from 'react'
import Grid2 from '@mui/material/Unstable_Grid2'

export function AddEntry() {
    const { caseId } = useParams()
    const caseRes = useGetter<CaseType>(['get_case_by_id', caseId])
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

    async function save() {
        const payload = {
            caseId,
            ombudsId,
            date: eventDate,
            medium,
            duration,
            notes,
        }
        await creator('add_entry', payload)
        navigate(`/case/${caseId}`)
    }

    return (
        <Box>
            <Dialog
                open={showPeopleDialog}
                onClose={() => setShowPeopleDialog(false)}
                fullScreen
            >
                <DialogTitle>Add Person to Entry</DialogTitle>
                <DialogContent sx={{ height: '70vh' }}>
                    <Grid2
                        container
                        spacing={2}
                        alignItems="stretch"
                        sx={{ height: '100%' }}
                    >
                        <Grid2
                            xs={12}
                            sm={4}
                            md={3}
                            sx={{ display: 'flex' }}
                        >
                            <Box
                                sx={{ border: '1px solid green', flex: 1, width: '100%' }}
                                p={1}
                            >
                                <Box>
                                    <Typography variant={'h6'}>Associated with Case</Typography>
                                </Box>
                            </Box>
                        </Grid2>

                        <Grid2
                            xs={12}
                            sm={8}
                            md={9}
                            sx={{ display: 'flex' }}
                        >
                            <Box sx={{ border: '1px solid blue', flex: 1, width: '100%' }}>
                                <PersonFinder />
                            </Box>
                        </Grid2>
                    </Grid2>
                </DialogContent>

                <DialogActions>
                    <Stack
                        spacing={2}
                        direction={'row'}
                    >
                        <Button
                            variant={'outlined'}
                            onClick={() => setShowPeopleDialog(false)}
                        >
                            Cancel
                        </Button>
                        <Button
                            variant={'contained'}
                            onClick={() => {
                                setShowPeopleDialog(false)
                            }}
                        >
                            Save
                        </Button>
                    </Stack>
                </DialogActions>
            </Dialog>
            <Stack spacing={2}>
                <Box display={'flex'}>
                    <Box>
                        <Typography variant={'h5'}>
                            Add Entry to Case: <em>{caseRes.data?.name}</em>
                        </Typography>
                    </Box>
                    <Stack
                        spacing={2}
                        direction={'row'}
                        display={'flex'}
                        flex={1}
                        justifyContent={'flex-end'}
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
                                inputProps={{ min: 0, step: 15 }}
                            />
                        </Stack>
                    </RoundedContainer>
                    <RoundedContainer title={'Entry Priority'}>
                        <RadioGroup
                            value={entryPriority}
                            onChange={(evt) => setEntryPriority(evt.target.value)}
                        >
                            <FormControlLabel
                                key={'priamry'}
                                value={'primary'}
                                control={<Radio />}
                                label={'Primary'}
                            />
                            <FormControlLabel
                                key={'secondary'}
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
                        <Box
                            position={'absolute'}
                            bottom={8}
                            right={8}
                        >
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
