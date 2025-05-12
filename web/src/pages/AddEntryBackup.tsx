import { Box, Button, FormControlLabel, Radio, RadioGroup, Stack, TextField, Tooltip } from '@mui/material'
import { useState } from 'react'
import { IoaCodeSetter } from '../components/IoaCodeSetter'
import React from 'react'
import { RoundedContainer } from '../components/RoundedContainer'

export function AddEntryBackup() {
    const [contactName, setContactName] = useState('')
    const [password, setPassword] = useState('')
    const [contactType, setContactType] = useState('inPerson')
    const contactTypes = [
        { value: 'inPerson', label: 'In Person' },
        { value: 'phone', label: 'Phone' },
        { value: 'video', label: 'Videoconference' },
        { value: 'email', label: 'Email' },
        { value: 'other', label: 'Other' },
    ]
    const [contactPriority, setContactPriority] = useState('primary')
    const [activeCodes, setActiveCodes] = useState<string[]>([])
    const [gender, setGender] = useState<string>('N/A')
    const [role, setRole] = useState<string>('peon')
    const [generation, setGeneration] = useState<string>('unknown')
    const [openIndex, setOpenIndex] = React.useState(0)

    const setCodes = React.useCallback((codes: string[]) => {
        setActiveCodes(codes)
    }, [])

    const updateOpenIndex = React.useCallback((idx: number) => {
        setOpenIndex(idx)
    }, [])

    return (
        <Box>
            <Stack spacing={2}>
                <Box>AddEntry</Box>

                <Stack
                    display={'flex'}
                    direction={'row'}
                    spacing={2}
                >
                    <Box flex={1}>
                        <Stack spacing={2}>
                            <TextField
                                value={contactName}
                                onChange={(evt) => setContactName(evt.target.value)}
                                label={'Contact'}
                            />
                            <TextField
                                value={password}
                                onChange={(evt) => setPassword(evt.target.value)}
                                label={'Scrambler'}
                                type={'password'}
                            />
                            <Button variant={'outlined'}>Search for User</Button>
                        </Stack>
                    </Box>
                    <RoundedContainer title={'Associated Active Cases'}>
                        <Box></Box>
                    </RoundedContainer>
                </Stack>
                <Stack
                    spacing={2}
                    direction={'row'}
                    display={'flex'}
                >
                    <RoundedContainer title={'Date'}>
                        <Box>Date</Box>
                        <Box>Time</Box>
                        <Box>Duration</Box>
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
                </Stack>
                <RoundedContainer title={'Demographics'}>
                    <Stack
                        spacing={2}
                        direction={'row'}
                    >
                        <Box flex={1}>
                            <Box>Gender</Box>
                            <RadioGroup
                                value={gender}
                                onChange={(evt) => setGender(evt.target.value)}
                            >
                                <FormControlLabel
                                    value={'N/A'}
                                    control={<Radio />}
                                    label={'N/A'}
                                />
                                <FormControlLabel
                                    value={'male'}
                                    control={<Radio />}
                                    label={'Male'}
                                />
                                <FormControlLabel
                                    value={'female'}
                                    control={<Radio />}
                                    label={'Female'}
                                />
                                <FormControlLabel
                                    value={'nonbinary'}
                                    control={<Radio />}
                                    label={'Non-Binary'}
                                />
                                <FormControlLabel
                                    value={'trans'}
                                    control={<Radio />}
                                    label={'Transgender'}
                                />
                            </RadioGroup>
                        </Box>
                        <Box flex={1}>
                            <Box>Role</Box>
                            <RadioGroup
                                value={role}
                                onChange={(evt) => setRole(evt.target.value)}
                            >
                                <FormControlLabel
                                    value={'peon'}
                                    control={<Radio />}
                                    label={'Peon'}
                                />
                                <FormControlLabel
                                    value={'undergrad'}
                                    control={<Radio />}
                                    label={'Undergrad'}
                                />
                                <FormControlLabel
                                    value={'gradstudent'}
                                    control={<Radio />}
                                    label={'Graduate Student'}
                                />
                                <FormControlLabel
                                    value={'Staff'}
                                    control={<Radio />}
                                    label={'Staff'}
                                />
                                <FormControlLabel
                                    value={'Tenured Faculty'}
                                    control={<Radio />}
                                    label={'Tenured Faculty'}
                                />
                                <FormControlLabel
                                    value={'Trenure-Track Faculty'}
                                    control={<Radio />}
                                    label={'Tenure-Track Faculty'}
                                />
                                <FormControlLabel
                                    value={'Adjunct Faculty'}
                                    control={<Radio />}
                                    label={'Adjunct Faculty'}
                                />
                                <FormControlLabel
                                    value={'Visiting Faculty'}
                                    control={<Radio />}
                                    label={'Visiting Faculty'}
                                />
                                <FormControlLabel
                                    value={'Administrator'}
                                    control={<Radio />}
                                    label={'Aministrator'}
                                />
                                <FormControlLabel
                                    value={'Imaginary'}
                                    control={<Radio />}
                                    label={'Imaginary'}
                                />
                                <FormControlLabel
                                    value={'management'}
                                    control={<Radio />}
                                    label={'Management'}
                                />
                                <FormControlLabel
                                    value={'outsider'}
                                    control={<Radio />}
                                    label={'Outside Organization'}
                                />
                            </RadioGroup>
                        </Box>
                        <Box flex={1}>
                            <Box>Generation</Box>
                            <RadioGroup
                                value={generation}
                                onChange={(evt) => setGeneration(evt.target.value)}
                            >
                                <FormControlLabel
                                    value={'unknown'}
                                    control={<Radio />}
                                    label={'Unknown'}
                                />
                                <Tooltip title={'Born 1928-1945'}>
                                    <FormControlLabel
                                        value={'silent'}
                                        control={<Radio />}
                                        label={'Silent'}
                                    />
                                </Tooltip>
                                <Tooltip title={'Born 1946-1964'}>
                                    <FormControlLabel
                                        value={'boomer'}
                                        control={<Radio />}
                                        label={'Boomer'}
                                    />
                                </Tooltip>
                                <Tooltip title={'Born 1965-1980'}>
                                    <FormControlLabel
                                        value={'genx'}
                                        control={<Radio />}
                                        label={'Gen X'}
                                    />
                                </Tooltip>
                                <Tooltip title={'Born 1981-1996'}>
                                    <FormControlLabel
                                        value={'Millenial'}
                                        control={<Radio />}
                                        label={'Millenial'}
                                    />
                                </Tooltip>
                                <Tooltip title={'Born 1997-2012'}>
                                    <FormControlLabel
                                        value={'genZ'}
                                        control={<Radio />}
                                        label={'Gen Z'}
                                    />
                                </Tooltip>
                                <Tooltip title={'Born 2013-2025'}>
                                    <FormControlLabel
                                        value={'genAlpha'}
                                        control={<Radio />}
                                        label={'Gen Alpha'}
                                    />
                                </Tooltip>
                            </RadioGroup>
                        </Box>
                    </Stack>
                </RoundedContainer>
                <RoundedContainer title={'Codes'}>
                    <IoaCodeSetter
                        activeCodes={activeCodes}
                        setActiveCodes={setCodes}
                        openIndex={openIndex}
                        setOpenIndex={updateOpenIndex}
                    />
                </RoundedContainer>
                <RoundedContainer title={'Tags'}></RoundedContainer>
            </Stack>
        </Box>
    )
}
