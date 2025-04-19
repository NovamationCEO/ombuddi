import {
    Button,
    Dialog,
    DialogActions,
    DialogContent,
    DialogContentText,
    DialogTitle,
    TextField,
    Tooltip,
    useTheme,
} from '@mui/material'
import { Box, Stack } from '@mui/system'
import React from 'react'
import { RoundButton } from '../../trusted-components/RoundButton'
import { Lock } from '@mui/icons-material'
import { CodeSetter } from '../CodeSetter'
import { ioaCategories, ioaCodes } from '../../constants/ioaConstants'
import { RoundedContainer } from '../RoundedContainer'
import { SaveCancel } from '../../trusted-components/SaveCancel'

export function AddNewCase() {
    const [caseName, setCaseName] = React.useState('')
    const [imageUrl, setImageUrl] = React.useState('')
    const [activeCodes, setActiveCodes] = React.useState<string[]>([])
    const [showCodeSetter, setShowCodeSetter] = React.useState(false)
    const theme = useTheme()

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

    function save() {}

    function cancel() {}

    return (
        <Stack spacing={2}>
            <CodeSetter
                showCodeSetter={showCodeSetter}
                setShowCodeSetter={setShowCodeSetter}
                activeCodes={activeCodes}
                setActiveCodes={setActiveCodes}
            />

            <Box>Add New Workheap</Box>
            <Box
                display={'flex'}
                alignItems={'center'}
                gap={2}
            >
                <TextField
                    value={caseName}
                    onChange={(e) => setCaseName(e.target.value)}
                    label={'Workheap Name'}
                    fullWidth
                />
                <Box>
                    <Tooltip
                        title={
                            <Box>
                                <Box fontWeight={'bold'}>Choose a name to identify this workheap.</Box>
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
                <Tooltip title={'A random security image, based on the workheap name, to make identifying easier.'}>
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
            <RoundedContainer title={'IOA Codes'}>
                <Box
                    onClick={() => setShowCodeSetter(true)}
                    border={'1px solid black'}
                    padding={2}
                >
                    {activeCodes.length === 0 && <Box>None Selected. Click to Edit.</Box>}
                    {activeCodes
                        .sort((a, b) => {
                            if (a[1] < b[1]) return -1
                            if (a[1] > b[1]) return 1
                            if (a[0] < b[0]) return -1
                            if (a[0] > b[0]) return 1
                            return 0
                        })
                        .map((code, n) => (
                            <Box key={code}>
                                {activeCodes.length > 0 && (n === 0 || code[0] !== activeCodes[n - 1][0]) && (
                                    <Box
                                        color={'white'}
                                        bgcolor={theme.palette.secondary.dark}
                                        padding={0.5}
                                        marginTop={1}
                                    >
                                        {ioaCategories[Number(code[0]) - 1]}
                                    </Box>
                                )}
                                <b>{code}</b>: {ioaCodes.find((c) => c[0] === code)?.[1]}
                            </Box>
                        ))}
                </Box>
            </RoundedContainer>
            <SaveCancel
                onSave={save}
                onCancel={cancel}
            />
        </Stack>
    )
}
