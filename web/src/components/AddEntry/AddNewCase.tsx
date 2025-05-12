import { Button, TextField, Tooltip, Typography, useTheme } from '@mui/material'
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

type CaseType = {
    id: string
    name: string
    codes: string[]
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
        if (!caseName || !caseName.length) {
            setImageUrl(`https://singlecolorimage.com/get/${primaryColor.slice(1, 7)}/60x60`)
            return
        }
        setImageUrl(`https://picsum.photos/seed/${caseName}/60/60`)
    }, [caseName])

    async function save() {
        const payload = {
            name: caseName,
            description: description,
            codes: activeIoaCodes,
            status: 'active',
        }
        await creator<CaseType>('create_case', payload).then((response) => {
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
            {/* <IoaCodeSetter
                showCodeSetter={showIoaCodeSetter}
                setShowCodeSetter={setShowIoaCodeSetter}
                activeCodes={activeIoaCodes}
                setActiveCodes={setActiveIoaCodes}
            /> */}

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
                                    Security: This name is visible within your organization. It is saved in plaintext.
                                </Box>
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
            <SaveCancel
                onSave={save}
                onCancel={cancel}
            />
        </Stack>
    )
}
