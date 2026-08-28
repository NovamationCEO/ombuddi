import { Button, TextField, Tooltip, Typography, useTheme } from '@mui/material'
import { Box, Stack } from '@mui/system'
import React from 'react'
import { useNavigate } from 'react-router-dom'
import { RoundButton } from '../../trusted-components/RoundButton'
import { Lock } from '@mui/icons-material'
import { SaveCancel } from '../../trusted-components/SaveCancel'
import { useSnack } from '../../libraries/useSnack'
import { creator } from '../../tools/db_tools/creator'
import { CodeSetterBox } from '../CodeSetterBox'
import { RoundedContainer } from '../RoundedContainer'
import { useOrganization } from '../../tools/useOrganization'
import { institutionalPalette as palette } from '../../theme/institutionalPalette'
import { ReferralSourceSelector } from '../ReferralSourceSelector'
import { ReferralSourceSelectionType } from '../../types/majorTypes'
import { referralSelectionsAreValid } from '../../tools/referralSources'

const fieldStyle = {
    '& .MuiInputLabel-root': { color: 'text.secondary' },
    '& .MuiInputLabel-root.Mui-focused': { color: 'secondary.main' },
    '& .MuiOutlinedInput-root': {
        color: 'text.primary',
        bgcolor: 'background.paper',
        '& fieldset': { borderColor: 'divider' },
        '&:hover fieldset': { borderColor: 'secondary.main' },
        '&.Mui-focused fieldset': { borderColor: 'secondary.main' },
    },
} as const

export function AddNewCase() {
    const [caseName, setCaseName] = React.useState('')
    const [imageUrl, setImageUrl] = React.useState('')
    const [activeIoaCodes, setActiveIoaCodes] = React.useState<string[]>([])
    const [activeOrgCodes, setActiveOrgCodes] = React.useState<string[]>([])
    const [referralSources, setReferralSources] = React.useState<ReferralSourceSelectionType[]>([])
    const [showReferralErrors, setShowReferralErrors] = React.useState(false)
    const theme = useTheme()
    const setSnack = useSnack((state) => state.setSnack)
    const navigate = useNavigate()
    const [description, setDescription] = React.useState('')
    const [isSaving, setIsSaving] = React.useState(false)
    const organizationId = useOrganization().id
    // crypto.randomUUID is available in all modern browsers (requires HTTPS or localhost).
    // useMemo so the id is stable across re-renders while the user is filling out the form.
    const newId = React.useMemo(() => crypto.randomUUID(), [])

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
        if (isSaving) return
        if (!caseName.trim()) {
            setSnack({ message: 'Enter a case name before saving.', severity: 'error' })
            return
        }
        if (!referralSelectionsAreValid(referralSources)) {
            setShowReferralErrors(true)
            setSnack({ message: 'Specify the Other referral source before saving.', severity: 'error' })
            return
        }

        const payload = {
            id: newId,
            name: caseName,
            description: description,
            codes: [...new Set([...activeIoaCodes, ...activeOrgCodes])],
            status: 'active',
            referralSources: referralSources.map((selection) => ({
                id: selection.id,
                ...(selection.detail !== undefined ? { detail: selection.detail.trim() } : {}),
            })),
        }

        setIsSaving(true)
        try {
            const response = await creator<{ id: string; status: string; success: boolean }>('create_case', payload)
            if (response.success) {
                setSnack({
                    message: 'Case created successfully',
                    severity: 'success',
                })
                navigate(`/case/${response.id || newId}`)
                return
            }

            setSnack({
                message: `Unable to create case: ${response.status || 'Unknown error'}`,
                severity: 'error',
            })
        } catch (error) {
            setSnack({
                message: `Unable to create case: ${error instanceof Error ? error.message : 'Unknown error'}`,
                severity: 'error',
            })
        } finally {
            setIsSaving(false)
        }
    }

    function cancel() {}

    return (
        <Box
            sx={{
                minHeight: '100%',
                p: { xs: 3, sm: 4, lg: 5 },
                boxSizing: 'border-box',
                color: palette.text,
                background: `linear-gradient(122deg, ${palette.background} 0%, ${palette.background} 76%, ${palette.backgroundDeep} 76%)`,
            }}
        >
            <Stack
                spacing={2}
                sx={{ maxWidth: 1360, mx: 'auto' }}
            >
            <Box>
                <Typography
                    variant={'h5'}
                    sx={{ color: palette.text }}
                >
                    Add New Case
                </Typography>
            </Box>
            <Box
                sx={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 2
                }}>
                <TextField
                    value={caseName}
                    onChange={(e) => setCaseName(e.target.value)}
                    label={'Case Name'}
                    fullWidth
                    sx={fieldStyle}
                />
                <Box>
                    <Tooltip
                        title={
                            <Box>
                                <Box sx={{
                                    fontWeight: 'bold'
                                }}>Choose a name to identify this case.</Box>
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
                            <RoundButton bgcolor="background.paper">
                                <Lock sx={{ color: 'secondary.main' }} />
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
                        sx={{
                            padding: 1,
                            width: 60,
                            height: 60,
                            boxSizing: 'content-box',
                            bgcolor: 'background.paper',
                            border: '1px solid',
                            borderColor: 'divider',
                            borderRadius: 1,
                        }}>
                        <img
                            src={imageUrl}
                            alt={caseName}
                            style={{ display: 'block', width: 60, height: 60 }}
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
                    sx={fieldStyle}
                />
            </Box>
            <Stack
                spacing={2}
                direction={'row'}
                sx={{
                    display: 'flex'
                }}
            >
                <CodeSetterBox
                    activeCodeIds={activeIoaCodes}
                    setActiveCodeIds={setActiveIoaCodes}
                    source={{ kind: 'ioa' }}
                />
                <CodeSetterBox
                    activeCodeIds={activeOrgCodes}
                    setActiveCodeIds={setActiveOrgCodes}
                    source={{ kind: 'org', organizationId }}
                />
            </Stack>
            <Stack spacing={2}>
                <RoundedContainer title={'Referral Sources'}>
                    <ReferralSourceSelector
                        value={referralSources}
                        onChange={(value) => {
                            setReferralSources(value)
                            setShowReferralErrors(false)
                        }}
                        showErrors={showReferralErrors}
                        disabled={isSaving}
                    />
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
                    saving={isSaving}
                />
            </Stack>
        </Box>
    );
}
