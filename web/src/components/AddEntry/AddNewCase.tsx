import {
    Autocomplete,
    Button,
    Checkbox,
    Chip,
    FormControlLabel,
    FormGroup,
    TextField,
    Tooltip,
    Typography,
    useTheme,
} from '@mui/material'
import { Box, Stack } from '@mui/system'
import React from 'react'
import { RoundButton } from '../../trusted-components/RoundButton'
import { Lock } from '@mui/icons-material'
import { SaveCancel } from '../../trusted-components/SaveCancel'
import { useSnack } from '../../libraries/useSnack'
import { creator } from '../../tools/db_tools/creator'
import { useUserId } from '../../tools/useUserId'
import { useGetter } from '../../tools/db_tools/useGetter'
import { CodeSetterBox } from '../CodeSetterBox'
import { useIoaOrgId } from '../../tools/useIoaOrgId'
import { OmbudsType } from '../../types/majorTypes'
import { RoundedContainer } from '../RoundedContainer'

const referralOptionsRes = {
    data: [
        { id: '1', name: 'HR' },
        { id: '2', name: 'Employee assistance program' },
        { id: '3', name: 'External resource' },
        { id: '4', name: 'General counsel' },
        { id: '5', name: 'Supervisor' },
        { id: '6', name: 'Peer or colleague' },
        { id: '7', name: 'Friend or family member' },
        { id: '8', name: 'Presentation or event' },
        { id: '9', name: 'Poster or brochure' },
        { id: '10', name: 'Internet search' },
        { id: '11', name: 'Other (please specify)' },
        { id: '12', name: 'Unknown' },
    ],
}

export function AddNewCase() {
    const [caseName, setCaseName] = React.useState('')
    const [imageUrl, setImageUrl] = React.useState('')
    const [activeIoaCodes, setActiveIoaCodes] = React.useState<string[]>([])
    const [activeOrgCodes, setActiveOrgCodes] = React.useState<string[]>([])
    const theme = useTheme()
    const setSnack = useSnack((state) => state.setSnack)
    const [description, setDescription] = React.useState('')
    const userId = useUserId()
    const ombudsRes = useGetter<OmbudsType>(['get_ombuds_by_id', userId])
    const organizationId = ombudsRes.data?.organizationId
    const ioaId = useIoaOrgId()
    // crypto.randomUUID is available in all modern browsers (requires HTTPS or localhost).
    // useMemo so the id is stable across re-renders while the user is filling out the form.
    const newId = React.useMemo(() => crypto.randomUUID(), [])

    const [activeReferralSourceIds, setActiveReferralSourceIds] = React.useState<string[]>([])
    // const [personName, setPersonName] = React.useState('')
    // const [hash, setHash] = React.useState('')

    // const hashedName = personName + hash

    // const personRes = useGetter<PersonType[]>(['get_persons_by_hashed_name', hashedName])

    async function getRandomName() {
        const newRandomName = await fetch('https://random-word-api.herokuapp.com/word?number=3')
            .then((response) => response.json())
            .then((data) => {
                const randomName = data.join(' ')
                return randomName
            })
            .catch((error) => {
                console.error('Error fetching random name:', error)
                return 'Random Name'
            })
        setCaseName(newRandomName)
    }

    React.useEffect(() => {
        const primaryColor = theme.palette.primary.main
        if (!newId || !newId.length) {
            setImageUrl(`https://singlecolorimage.com/get/${primaryColor.slice(1, 7)}/60x60`)
            return
        }
        setImageUrl(`https://picsum.photos/seed/${newId}/60/60`)
    }, [newId])

    async function save() {
        const payload = {
            id: newId,
            name: caseName,
            description: description,
            codes: activeIoaCodes,
            status: 'active',
        }
        await creator<{ id: string; status: string; success: boolean }>('create_case', payload).then((response) => {
            console.log(response)
            if (response.success) {
                setSnack({
                    message: 'Case created successfully',
                    severity: 'success',
                })
            } else {
                setSnack({
                    message: 'Error creating case - ' + response.status,
                    severity: 'error',
                })
            }
        })
    }

    function cancel() {}

    return (
        <Stack spacing={2}>
            <Box>
                <Typography variant={'h5'}>Add New Case</Typography>
            </Box>
            <Box
                display={'flex'}
                alignItems={'center'}
                gap={2}
            >
                <TextField
                    value={caseName}
                    onChange={(e) => setCaseName(e.target.value)}
                    label={'Case Name'}
                    fullWidth
                />
                <Box>
                    <Tooltip
                        title={
                            <Box>
                                <Box fontWeight={'bold'}>Choose a name to identify this case.</Box>
                                <Box>
                                    Security:{' '}
                                    <em>This name is visible within your organization. It is saved in plaintext.</em>
                                </Box>
                                <Box>Security 0: Choose a descriptive name.</Box>
                                <Box>Security +1: Choose a name without sensitive information.</Box>
                                <Box>
                                    Security +2: Randomize the title; it will be recognizable to you but meaningless to
                                    anyone else.
                                </Box>
                            </Box>
                        }
                    >
                        <Box>
                            <RoundButton>
                                <Lock />
                            </RoundButton>
                        </Box>
                    </Tooltip>
                </Box>
                <Button
                    variant={'outlined'}
                    onClick={getRandomName}
                >
                    Randomize
                </Button>
                <Tooltip title={'A random security image, based on the case name, to make identifying easier.'}>
                    <Box
                        padding={1}
                        width={60}
                        height={60}
                        border={'1px solid black'}
                    >
                        <img
                            src={imageUrl}
                            alt={caseName}
                        />
                    </Box>
                </Tooltip>
            </Box>
            <Box>
                <TextField
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    label={'Description'}
                    fullWidth
                    multiline
                    rows={3}
                />
            </Box>

            <Stack
                display={'flex'}
                spacing={2}
                direction={'row'}
            >
                <CodeSetterBox
                    activeCodeIds={activeIoaCodes}
                    setActiveCodeIds={setActiveIoaCodes}
                    organizationId={ioaId}
                />
                <CodeSetterBox
                    activeCodeIds={activeOrgCodes}
                    setActiveCodeIds={setActiveOrgCodes}
                    organizationId={organizationId}
                />
            </Stack>
            <Stack
                spacing={2}
                direction={'row'}
            >
                <RoundedContainer title={'Referral Sources'}>
                    <FormGroup>
                        {referralOptionsRes.data.map((option) => (
                            <FormControlLabel
                                key={option.id}
                                control={<Checkbox defaultChecked />}
                                label={option.name}
                            />
                        ))}
                    </FormGroup>
                </RoundedContainer>
                <RoundedContainer title={'Referral Sources'}>
                    <Box>
                        <Autocomplete
                            multiple
                            options={referralOptionsRes.data || []}
                            getOptionLabel={(opt) => opt.name}
                            value={
                                referralOptionsRes.data?.filter((opt) => activeReferralSourceIds.includes(opt.id)) || []
                            }
                            onChange={(_, newVals) => {
                                setActiveReferralSourceIds(newVals.map((opt) => opt.id))
                            }}
                            renderTags={(selected, getTagProps) =>
                                selected.map((opt, idx) => (
                                    <Chip
                                        key={opt.id}
                                        label={opt.name}
                                        {...getTagProps({ index: idx })}
                                    />
                                ))
                            }
                            renderInput={(params) => (
                                <TextField
                                    {...params}
                                    variant="outlined"
                                    label="Select one or more"
                                    placeholder="Referral sources"
                                />
                            )}
                        />
                    </Box>
                </RoundedContainer>
            </Stack>
            {/* <RoundedContainer title={'Associated People'}>
                <Box>
                    <Stack spacing={2}>
                        <TextField
                            value={personName}
                            onChange={(e) => setPersonName(e.target.value)}
                            label={'Person Name'}
                            fullWidth
                        />
                        <TextField
                            value={hash}
                            onChange={(e) => setHash(e.target.value)}
                            label={'Hash'}
                            fullWidth
                        />
                        <Button
                            onClick={search}
                            variant={'contained'}
                        >
                            Search
                        </Button>

                        <Box>
                            <RoundButton onClick={() => navigate('/add_person')}>
                                <Add />
                            </RoundButton>
                        </Box>
                    </Stack>
                </Box>
            </RoundedContainer> */}

            <SaveCancel
                onSave={save}
                onCancel={cancel}
            />
        </Stack>
    )
}
