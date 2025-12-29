import { Box, Button, FormControlLabel, Radio, RadioGroup, Stack, TextField, Tooltip, Typography } from '@mui/material'
import { useState } from 'react'
import React from 'react'
import { RoundedContainer } from '../components/RoundedContainer'
import { useNavigate, useParams } from 'react-router-dom'
import { useGetter } from '../tools/db_tools/useGetter'
import { CaseType } from '../types/majorTypes'

export function AddEntry() {
    const { caseId } = useParams()
    const caseRes = useGetter<CaseType>(['get_case_by_id', caseId])
    const [notesText, setNotesText] = useState('')
    const navigate = useNavigate()
    const [duration, setDuration] = useState(30)
    const [eventDate, setEventDate] = useState(() => new Date().toISOString().slice(0, 10))

    const [contactType, setContactType] = useState('inPerson')
    const contactTypes = [
        { value: 'inPerson', label: 'In Person' },
        { value: 'phone', label: 'Phone' },
        { value: 'video', label: 'Videoconference' },
        { value: 'email', label: 'Email' },
        { value: 'other', label: 'Other' },
    ]
    const [contactPriority, setContactPriority] = useState('primary')

    return (
        <Box>
            <Stack spacing={2}>
                <Box display={'flex'}>
                    <Box>
                        <Typography variant={'h5'}>Add Entry to Case: {caseRes.data?.name}</Typography>
                    </Box>
                    <Button
                        variant={'outlined'}
                        onClick={() => navigate(`/case/${caseId}`)}
                        sx={{ ml: 'auto' }}
                    >
                        Cancel
                    </Button>
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
                    <RoundedContainer title={'Contact Priority'}>
                        <RadioGroup
                            value={contactPriority}
                            onChange={(evt) => setContactPriority(evt.target.value)}
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
                    <RoundedContainer title={'Contact Method'}>
                        <RadioGroup
                            value={contactType}
                            onChange={(evt) => setContactType(evt.target.value)}
                        >
                            {contactTypes.map((type) => (
                                <FormControlLabel
                                    key={type.value}
                                    value={type.value}
                                    control={<Radio />}
                                    label={type.label}
                                />
                            ))}
                        </RadioGroup>
                    </RoundedContainer>

                    <RoundedContainer title={'Codes'}>
                        {/* <IoaCodeSetter
                        activeCodes={activeCodes}
                        setActiveCodes={setCodes}
                        openIndex={openIndex}
                        setOpenIndex={updateOpenIndex}
                    /> */}
                    </RoundedContainer>
                </Stack>
                <Box>
                    <TextField
                        label={'Notes'}
                        value={notesText}
                        onChange={(evt) => setNotesText(evt.target.value)}
                        multiline
                        rows={6}
                        fullWidth
                    />
                </Box>
            </Stack>
        </Box>
    )
}
