import {
    Autocomplete,
    Box,
    Divider,
    Drawer,
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
import { usePicklists } from '../../tools/usePicklists'
import { MySwitch } from '../MySwitch'
import { RoundedContainer } from '../RoundedContainer'
import { Close, Lock, LockOpen, QuestionMark } from '@mui/icons-material'
import { SaveCancel } from '../../trusted-components/SaveCancel'
import { creator } from '../../tools/db_tools/creator'
import { useSnack } from '../../libraries/useSnack'
import { PersonType } from '../../types/majorTypes'
import { useHashName } from '../../tools/useHashName'
import { RoundButton } from '../../trusted-components/RoundButton'
import { useOrganization } from '../../tools/useOrganization'
import { useSessionSalt } from '../../libraries/useSessionSalt'

/**
 * Reusable person-entry form. Owns all field state, the salt-phrase tooltip,
 * the hash pipeline, and the POST to /add_person. The two consumers are:
 *   - the `/add_person` route, which renders the form on its own page
 *   - the inline "Create new user" dialog inside AddEntry
 *
 * On a successful save the form constructs the new PersonType from local
 * state (plus the server-returned id) and hands it to `onSaved`. That lets
 * callers stage the new person immediately without an extra fetch.
 */

function DemographicPicker(props: {
    kind: string
    value: string
    onChange: (v: string) => void
}) {
    const { kind, value, onChange } = props
    const { items, isLoading } = usePicklists(kind)
    const knownValues = items.map((p) => p.name)

    const [otherMode, setOtherMode] = React.useState(false)
    const [otherText, setOtherText] = React.useState('')

    // When picklist finishes loading, detect if the current value is a custom one.
    React.useEffect(() => {
        if (!isLoading && items.length > 0 && value && !knownValues.includes(value)) {
            setOtherMode(true)
            setOtherText(value)
        }
    }, [isLoading, items.length])

    const radioValue = otherMode ? '__other__' : value

    function handleRadioChange(newVal: string) {
        if (newVal === '__other__') {
            setOtherMode(true)
        } else {
            setOtherMode(false)
            setOtherText('')
            onChange(newVal)
        }
    }

    return (
        <RadioGroup
            value={radioValue}
            onChange={(e) => handleRadioChange(e.target.value)}
        >
            {items.map((item) => (
                <Tooltip key={item.id} title={item.description || ''} placement="right">
                    <FormControlLabel
                        value={item.name}
                        control={<Radio />}
                        label={item.name}
                    />
                </Tooltip>
            ))}
            <FormControlLabel
                value="__other__"
                control={<Radio />}
                label="Other..."
            />
            {otherMode && (
                <TextField
                    size="small"
                    value={otherText}
                    onChange={(e) => {
                        setOtherText(e.target.value)
                        onChange(e.target.value)
                    }}
                    placeholder="Specify..."
                    autoFocus={!otherText}
                    sx={{ ml: 4, mt: 0.5, width: '80%' }}
                />
            )}
        </RadioGroup>
    )
}

function SaltStrategy(props: { name: string; summary: string; detail: string }) {
    const { name, summary, detail } = props
    return (
        <Box>
            <Typography variant="subtitle2">
                <b>{name}</b>
            </Typography>
            <Typography
                variant="body2"
                sx={{ fontStyle: 'italic', mb: 0.5 }}
            >
                {summary}
            </Typography>
            <Typography
                variant="body2"
                color="text.secondary"
            >
                {detail}
            </Typography>
        </Box>
    )
}

function Title(props: { children: React.ReactNode }) {
    const { children } = props
    const theme = useTheme()

    return (
        <Box
            sx={{
                padding: 1,
                bgcolor: theme.palette.primary.main,
                color: 'white',
                borderRadius: 1,
                marginRight: 1,
                fontWeight: 'bold',
            }}
        >
            {children}
        </Box>
    )
}

export function PersonForm(props: {
    initialName?: string
    onSaved: (person: PersonType) => void
    onCancel?: () => void
}) {
    const { initialName = '', onSaved, onCancel } = props
    const [name, setName] = React.useState(initialName)
    const [salt, setSalt] = React.useState('')
    const [isSecure, setIsSecure] = React.useState(true)
    const [saltGuideOpen, setSaltGuideOpen] = React.useState(false)
    const [generation, setGeneration] = React.useState('unknown')
    const [gender, setGender] = React.useState('N/A')
    const [race, setRace] = React.useState('unknown')
    const [isInternational, setIsInternational] = React.useState(false)
    const [primaryRole, setPrimaryRole] = React.useState('unknown')
    const [category1, setCategory1] = React.useState('')
    const [category2, setCategory2] = React.useState('')
    const [category3, setCategory3] = React.useState('')
    const setSnack = useSnack((state) => state.setSnack)
    const organization = useOrganization()
    const orgId = organization.id
    const sessionSalt = useSessionSalt((s) => s.sessionSalt)

    // Pre-populate from the session salt the first time it becomes available.
    React.useEffect(() => {
        if (sessionSalt !== null && salt === '') {
            setSalt(sessionSalt)
        }
    }, [sessionSalt])

    const hashedName = useHashName(name, salt)

    async function save() {
        if (!orgId) return
        const payload = isSecure
            ? {
                  hashedName,
                  isPublic: false,
                  gender,
                  generation,
                  race,
                  primaryRole,
                  isInternational,
                  category1: category1?.length ? category1 : undefined,
                  category2: category2?.length ? category2 : undefined,
                  category3: category3?.length ? category3 : undefined,
                  organizationId: orgId,
              }
            : {
                  publicName: name,
                  isPublic: true,
                  gender,
                  generation,
                  race,
                  primaryRole,
                  isInternational,
                  category1: category1?.length ? category1 : undefined,
                  category2: category2?.length ? category2 : undefined,
                  category3: category3?.length ? category3 : undefined,
                  organizationId: orgId,
              }
        try {
            const res = await creator<{ id: string; success: boolean }>('add_person', payload)
            if (!res?.id) {
                throw new Error('Server did not return an id for the new person.')
            }
            const newPerson: PersonType = {
                id: res.id,
                hashedName: isSecure ? (hashedName ?? '') : undefined,
                publicName: isSecure ? undefined : name,
                isPublic: !isSecure,
                gender,
                generation,
                race,
                primaryRole,
                isInternational,
                category1,
                category2,
                category3,
                organizationId: orgId,
            }
            setSnack({ message: 'Person added successfully', severity: 'success' })
            onSaved(newPerson)
        } catch (e) {
            console.error(e)
            setSnack({
                message: e instanceof Error ? e.message : 'Unable to add person',
                severity: 'error',
            })
        }
    }

    return (
        <Stack spacing={2}>
            <Box
                sx={{
                    display: 'flex',
                    alignItems: 'center',
                }}
            >
                <Stack
                    spacing={2}
                    sx={{ flex: 1 }}
                >
                    <TextField
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        label="Full Name"
                    />
                    {isSecure && (
                        <Box sx={{ display: 'flex' }}>
                            <Box sx={{ flex: 1 }}>
                                <TextField
                                    value={salt}
                                    onChange={(e) => setSalt(e.target.value)}
                                    label="Salt Phrase"
                                    fullWidth
                                />
                            </Box>
                            <Box
                                sx={{
                                    ml: 1,
                                    display: 'flex',
                                    alignItems: 'center',
                                }}
                            >
                                <RoundButton
                                    onClick={() => setSaltGuideOpen(true)}
                                    tooltipText="About salt phrases"
                                >
                                    <QuestionMark />
                                </RoundButton>
                            </Box>
                        </Box>
                    )}
                </Stack>
                <Box sx={{ flex: 1, padding: 1 }}>
                    <Box
                        onClick={() => setIsSecure(!isSecure)}
                        sx={{
                            border: '1px solid gray',
                            width: 135,
                            height: 135,
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            justifyContent: 'center',
                            borderRadius: 1,
                            cursor: 'pointer',
                        }}
                    >
                        <Box
                            sx={{
                                flex: 1,
                                display: 'flex',
                                justifyContent: 'center',
                                alignItems: 'center',
                            }}
                        >
                            <Box
                                sx={{
                                    width: 100,
                                    height: 100,
                                    borderRadius: '50%',
                                    border: '1px solid gray',
                                    display: 'flex',
                                    justifyContent: 'center',
                                    alignItems: 'center',
                                }}
                            >
                                {isSecure ? <Lock fontSize={'large'} /> : <LockOpen fontSize={'large'} />}
                            </Box>
                        </Box>
                        <Box>{isSecure ? 'Secure' : 'Insecure'}</Box>
                    </Box>
                </Box>
            </Box>
            <RoundedContainer title={'Demographics'}>
                <Box sx={{ display: 'flex' }}>
                    <Stack
                        spacing={2}
                        direction={'row'}
                        sx={{ flex: 1 }}
                    >
                        <Box sx={{ flex: 1 }}>
                            <Title>Gender</Title>
                            <DemographicPicker kind="gender" value={gender} onChange={setGender} />
                        </Box>
                    </Stack>
                    <Box sx={{ flex: 1 }}>
                        <Title>Generation</Title>
                        <DemographicPicker kind="generation" value={generation} onChange={setGeneration} />
                    </Box>
                    <Box sx={{ flex: 1 }}>
                        <Title>Race</Title>
                        <DemographicPicker kind="race" value={race} onChange={setRace} />
                    </Box>
                </Box>
            </RoundedContainer>
            <Drawer
                anchor="right"
                open={saltGuideOpen}
                onClose={() => setSaltGuideOpen(false)}
                slotProps={{ paper: { sx: { width: 380, p: 3 } } }}
            >
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                    <Typography
                        variant="h6"
                        sx={{ flex: 1 }}
                    >
                        Salt Phrase Guide
                    </Typography>
                    <RoundButton onClick={() => setSaltGuideOpen(false)}>
                        <Close />
                    </RoundButton>
                </Box>
                <Typography
                    variant="body2"
                    sx={{ mb: 2 }}
                >
                    A salt phrase is mixed into a visitor's name before hashing. It acts as a second secret: someone
                    with the hash database still can't look up a visitor without knowing the exact salt you used. Choose
                    a strategy that matches how you want to balance cross-reference ability against isolation.
                </Typography>
                <Divider sx={{ mb: 2 }} />
                <Stack spacing={2.5}>
                    <SaltStrategy
                        name="Organizational salt"
                        summary="A phrase shared by every ombuds in your organization."
                        detail="Finding this visitor requires a valid Ombuddi login, the correct org license, the visitor's exact name spelling, and the shared salt. Enables cross-ombuds continuity if a case is handed off."
                    />
                    <SaltStrategy
                        name="Personal salt"
                        summary="A phrase only you know — not shared with colleagues."
                        detail="Hides the visitor even from other licensed ombuds in your organization. Records become inaccessible if you leave without transferring them."
                    />
                    <SaltStrategy
                        name="Time-based salt"
                        summary="A phrase that rotates on a schedule (e.g. the year)."
                        detail="The same visitor with a different salt is an entirely different record. Limits how far back cross-referencing reaches — records from prior periods are effectively isolated."
                    />
                    <SaltStrategy
                        name="Per-case salt"
                        summary="A unique phrase for each case."
                        detail="Maximum isolation. A visitor attached to two cases under different salts has no connection between them for any purpose, including reporting."
                    />
                    <SaltStrategy
                        name="Scrambled spelling"
                        summary="An intentional misspelling of the visitor's name as the salt."
                        detail="Records the 'wrong' name in the hash. Someone who obtains the hash database and knows the real name cannot find this visitor without also knowing which misspelling was used. Works best combined with another strategy."
                    />
                    <SaltStrategy
                        name="Blank salt"
                        summary="No additional phrase — the name alone is hashed."
                        detail="Still protected by Ombuddi authentication and the server-side pepper. Lookups still require the exact name spelling. Weakest option, but sufficient for low-sensitivity situations or when cross-referencing convenience matters more than isolation."
                    />
                </Stack>
            </Drawer>

            <RoundedContainer title={'Role'}>
                <Box sx={{ display: 'flex' }}>
                    <Box sx={{ flex: 1 }}>
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
                    <Box sx={{ flex: 1 }}>
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
                                    setCategory1(newValue ?? '')
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
                                    setCategory2(newValue ?? '')
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
                                    setCategory3(newValue ?? '')
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
                    onCancel={onCancel ?? (() => null)}
                />
            </RoundedContainer>
        </Stack>
    )
}
