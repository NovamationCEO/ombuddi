import { pageLayoutStyle } from '../../theme/pageLayout'
import { Box, Button, Stack, Typography } from '@mui/material'
import { ThemeProvider } from '@mui/material/styles'
import React from 'react'
import { useNavigate } from 'react-router-dom'
import { PersonForm } from './PersonForm'
import { PersonFinder } from '../PersonFinder'
import { caseFolderTheme } from '../../theme/caseFolderTheme'
import type { PersonCredentials } from '../../tools/personLookup'

export function AddPerson() {
    const [creation, setCreation] = React.useState<PersonCredentials | null>(null)
    const [saved, setSaved] = React.useState(false)
    const navigate = useNavigate()
    return (
        <Box sx={pageLayoutStyle}>
            <ThemeProvider theme={caseFolderTheme}>
                <Box className="people-folder">
                    <Typography
                        component="h1"
                        sx={{ fontFamily: 'Georgia, serif', fontSize: '2rem', mb: 3 }}
                    >
                        People
                    </Typography>
                    {creation ? (
                        <PersonForm
                            credentials={creation}
                            onCancel={() => setCreation(null)}
                            onSaved={() => {
                                setCreation(null)
                                setSaved(true)
                            }}
                        />
                    ) : (
                        <Stack spacing={2}>
                            {saved && <Typography role="status">Person saved.</Typography>}
                            <PersonFinder
                                onCreateRequest={(credentials) => {
                                    setCreation(credentials)
                                    setSaved(false)
                                }}
                            />
                            <Button
                                onClick={() => navigate(-1)}
                                sx={{ alignSelf: 'flex-end' }}
                            >
                                Done
                            </Button>
                        </Stack>
                    )}
                </Box>
            </ThemeProvider>
        </Box>
    )
}
