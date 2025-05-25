import {
    Autocomplete,
    Box,
    FormControlLabel,
    Radio,
    RadioGroup,
    Stack,
    TextField,
    Tooltip,
    Typography,
    useTheme,
} from '@mui/material'
import React from 'react'
import { MySwitch } from '../MySwitch'
import { RoundedContainer } from '../RoundedContainer'
import { Lock, LockOpen, QuestionMark } from '@mui/icons-material'
import { SaveCancel } from '../../trusted-components/SaveCancel'
import { creator } from '../../tools/db_tools/creator'
import { useSnack } from '../../libraries/useSnack'
import { PersonType } from '../../types/majorTypes'
import { useHashName } from '../../tools/useHashName'
import { RoundButton } from '../../trusted-components/RoundButton'

function Title(props: { children: React.ReactNode }) {
    const { children } = props
    const theme = useTheme()

    return (
        <Box
            padding={1}
            bgcolor={theme.palette.primary.main}
            color={'white'}
            borderRadius={1}
            marginRight={1}
            fontWeight={'bold'}
        >
            {children}
        </Box>
    )
}

export function AddPerson() {
    const [name, setName] = React.useState('')
    const [salt, setHash] = React.useState('')
    const [isSecure, setIsSecure] = React.useState(true)
    const [generation, setGeneration] = React.useState('unknown')
    const [gender, setGender] = React.useState('N/A')
    const [race, setRace] = React.useState('unknown')
    const [isInternational, setIsInternational] = React.useState(false)
    const [primaryRole, setPrimaryRole] = React.useState('unknown')
    const [category1, setCategory1] = React.useState('')
    const [category2, setCategory2] = React.useState('')
    const [category3, setCategory3] = React.useState('')
    const setSnack = useSnack((state) => state.setSnack)

    const hashedName = useHashName(name, salt)

    async function save() {
        const payload = {
            hashedName,
            gender,
            generation,
            race,
            primaryRole,
            isInternational,
            category1: category1?.length ? category1 : undefined,
            category2: category2?.length ? category2 : undefined,
            category3: category3?.length ? category3 : undefined,
        }
        console.log(payload)
        try {
            const res = await creator<PersonType>('add_person', payload)
            console.log(res)
            setSnack({
                message: 'Person added successfully',
                severity: 'success',
            })
        } catch (e) {
            console.error(e)
            setSnack({ message: e.message(), severity: 'error' })
        }
    }

    return (
        <Box>
            <Stack spacing={2}>
                <Typography variant="h4">Add Person</Typography>
                <Box
                    display={'flex'}
                    alignItems="center"
                >
                    <Stack
                        spacing={2}
                        flex={1}
                    >
                        <TextField
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            label="Full Name"
                        />
                        <Box display={'flex'}>
                            <Box flex={1}>
                                <TextField
                                    value={salt}
                                    onChange={(e) => setHash(e.target.value)}
                                    label="Salt Phrase"
                                    fullWidth
                                />
                            </Box>
                            <Box
                                ml={1}
                                display={'flex'}
                                alignItems={'center'}
                            >
                                <RoundButton
                                    onClick={() => null}
                                    tooltipText={
                                        <Box>
                                            Security: Salt Phrase. <br />
                                            For additional security, a salt phrase acts as an additional password
                                            required to access this person.
                                            <Box>You may consider using:</Box>
                                            <Box>
                                                <ul>
                                                    <li>An organizational Salt.</li>
                                                    <ul>
                                                        <li>
                                                            Ombuds in your organization share this password, as an extra
                                                            layer of security and anonymity. Accessing this record would
                                                            take an active organizational license, a valid Ombuddi
                                                            username and password associated with that organization, the
                                                            exact spelling of the person's name, AND the correct Salt.
                                                        </li>
                                                    </ul>
                                                    <li>A Salt unique to you.</li>
                                                    <ul>
                                                        <li>
                                                            This will hide this person even from other Ombuddi-licensed
                                                            ombuds in your organization.
                                                        </li>
                                                    </ul>
                                                    <li>A Salt that changes yearly.</li>
                                                    <ul>
                                                        <li>
                                                            A person with two (or more) different Salts is the same as
                                                            two (or more) entirely different people for all purposes.
                                                        </li>
                                                    </ul>
                                                    <li>A Salt per case.</li>
                                                    <ul>
                                                        <li>
                                                            No cross-referencing is possible; a person attached to
                                                            multiple cases is a 'new' person each time with no
                                                            connection to any previous records.
                                                        </li>
                                                    </ul>
                                                    <li>
                                                        A 'blank' Salt.
                                                        <ul>
                                                            <li>
                                                                This is still locked behind your personal username and
                                                                password, and still requires searching for the exact
                                                                spelling of the person's full name by someone with a
                                                                valid Ombuddi account within your organization.
                                                            </li>
                                                        </ul>
                                                    </li>
                                                </ul>
                                            </Box>
                                        </Box>
                                    }
                                >
                                    <QuestionMark />
                                </RoundButton>
                            </Box>
                        </Box>
                    </Stack>
                    <Box
                        flex={1}
                        padding={1}
                    >
                        <Box
                            border={'1px solid gray'}
                            width={135}
                            height={135}
                            sx={{ cursor: 'pointer' }}
                            onClick={() => setIsSecure(!isSecure)}
                            display={'flex'}
                            flexDirection={'column'}
                            alignItems={'center'}
                            justifyContent={'center'}
                            borderRadius={1}
                        >
                            <Box
                                flex={1}
                                display={'flex'}
                                justifyContent={'center'}
                                alignItems={'center'}
                                // display={'flex'}
                            >
                                <Box
                                    width={100}
                                    height={100}
                                    borderRadius={'50%'}
                                    border={'1px solid gray'}
                                    display={'flex'}
                                    justifyContent={'center'}
                                    alignItems={'center'}
                                >
                                    {isSecure ? <Lock fontSize={'large'} /> : <LockOpen fontSize={'large'} />}
                                </Box>
                            </Box>
                            <Box>{isSecure ? 'Secure' : 'Insecure'}</Box>
                        </Box>
                    </Box>
                </Box>
                <RoundedContainer title={'Demographics'}>
                    <Box display={'flex'}>
                        <Stack
                            flex={1}
                            spacing={2}
                            direction={'row'}
                        >
                            <Box flex={1}>
                                <Title>Gender</Title>
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
                                        value={'other'}
                                        control={<Radio />}
                                        label={'Other'}
                                    />
                                    <FormControlLabel
                                        value={'unknown'}
                                        control={<Radio />}
                                        label={'Unknown'}
                                    />
                                </RadioGroup>
                            </Box>
                        </Stack>
                        <Box flex={1}>
                            <Title>Generation</Title>
                            <RadioGroup
                                value={generation}
                                onChange={(evt) => setGeneration(evt.target.value)}
                            >
                                <FormControlLabel
                                    value={'unknown'}
                                    control={<Radio />}
                                    label={'Unknown'}
                                />

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
                        <Box flex={1}>
                            <Title>Race</Title>
                            <RadioGroup
                                value={race}
                                onChange={(evt) => setRace(evt.target.value)}
                            >
                                <FormControlLabel
                                    value={'unknown'}
                                    control={<Radio />}
                                    label={'Unknown'}
                                />
                                <FormControlLabel
                                    value={'asian'}
                                    control={<Radio />}
                                    label={'Asian'}
                                />
                                <FormControlLabel
                                    value={'black'}
                                    control={<Radio />}
                                    label={'Black / African American / Afro-Caribbean'}
                                />
                                <FormControlLabel
                                    value={'pacific'}
                                    control={<Radio />}
                                    label={'Native Hawaiian / Pacific Islander'}
                                />
                                <FormControlLabel
                                    value={'hispanic'}
                                    control={<Radio />}
                                    label={'Hispanic of any Race'}
                                />
                                <FormControlLabel
                                    value={'native'}
                                    control={<Radio />}
                                    label={'Native American / Alaskan Native'}
                                />
                                <FormControlLabel
                                    value={'white'}
                                    control={<Radio />}
                                    label={'White'}
                                />
                                <FormControlLabel
                                    value={'multi'}
                                    control={<Radio />}
                                    label={'Multi-racial'}
                                />
                            </RadioGroup>
                        </Box>
                    </Box>
                </RoundedContainer>
                <RoundedContainer title={'Role'}>
                    <Box display={'flex'}>
                        <Box flex={1}>
                            <Title>Primary Role</Title>
                            <RadioGroup
                                value={primaryRole}
                                onChange={(evt) => setPrimaryRole(evt.target.value)}
                            >
                                <FormControlLabel
                                    value={'unknown'}
                                    control={<Radio />}
                                    label={'Unknown'}
                                />
                                <FormControlLabel
                                    value={'exempt'}
                                    control={<Radio />}
                                    label={'Exempt / Professional Staff'}
                                />
                                <FormControlLabel
                                    value={'nonexempt'}
                                    control={<Radio />}
                                    label={'Non-Exempt / Hourly Staff'}
                                />
                                <FormControlLabel
                                    value={'tenure'}
                                    control={<Radio />}
                                    label={'Tenure-Track Faculty'}
                                />
                                <FormControlLabel
                                    value={'non-tenure'}
                                    control={<Radio />}
                                    label={'Non-Tenure Track Faculty'}
                                />
                                <FormControlLabel
                                    value={'undergrad'}
                                    control={<Radio />}
                                    label={'Undergraduate Student'}
                                />
                                <FormControlLabel
                                    value={'grad'}
                                    control={<Radio />}
                                    label={'Graduate Student'}
                                />
                                <FormControlLabel
                                    value={'former-student'}
                                    control={<Radio />}
                                    label={'Former Student'}
                                />
                                <FormControlLabel
                                    value={'alumni'}
                                    control={<Radio />}
                                    label={'Alumni'}
                                />
                                <FormControlLabel
                                    value={'former-employee'}
                                    control={<Radio />}
                                    label={'Former Employee'}
                                />
                                <FormControlLabel
                                    value={'parent'}
                                    control={<Radio />}
                                    label={'Parent / Relative'}
                                />
                                <FormControlLabel
                                    value={'other'}
                                    control={<Radio />}
                                    label={'Other'}
                                />
                            </RadioGroup>
                        </Box>
                        <Box flex={1}>
                            <Stack spacing={2}>
                                <Title>Categorization</Title>
                                <MySwitch
                                    value={isInternational}
                                    setValue={setIsInternational}
                                    label={'International'}
                                />
                                <Autocomplete
                                    value={category1}
                                    onChange={(_event, newValue) => {
                                        setCategory1(newValue)
                                    }}
                                    freeSolo
                                    disablePortal
                                    options={[]}
                                    sx={{ width: 300 }}
                                    renderInput={(params) => (
                                        <TextField
                                            {...params}
                                            label="Category 1"
                                        />
                                    )}
                                />
                                <Autocomplete
                                    value={category2}
                                    onChange={(_event, newValue) => {
                                        setCategory2(newValue)
                                    }}
                                    freeSolo
                                    disablePortal
                                    options={[]}
                                    sx={{ width: 300 }}
                                    renderInput={(params) => (
                                        <TextField
                                            {...params}
                                            label="Category 2"
                                        />
                                    )}
                                />
                                <Autocomplete
                                    value={category3}
                                    onChange={(_event, newValue) => {
                                        setCategory3(newValue)
                                    }}
                                    freeSolo
                                    disablePortal
                                    options={[]}
                                    sx={{ width: 300 }}
                                    renderInput={(params) => (
                                        <TextField
                                            {...params}
                                            label="Category 3"
                                        />
                                    )}
                                />
                            </Stack>
                        </Box>
                    </Box>
                    <SaveCancel
                        onSave={save}
                        onCancel={() => null}
                    />
                </RoundedContainer>
            </Stack>
        </Box>
    )
}
