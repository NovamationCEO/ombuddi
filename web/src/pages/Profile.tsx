import { ArrowForward, PersonOutlined } from '@mui/icons-material'
import { Box, Button, Stack, TextField, Typography } from '@mui/material'
import React from 'react'
import { RoundedContainer } from '../components/RoundedContainer'
import { useNavigate } from 'react-router-dom'
import { useOrganization } from '../tools/useOrganization'
import { useCurrentOmbuds } from '../tools/useCurrentOmbuds'

export function Profile() {
    const ombudsRes = useCurrentOmbuds()
    const organization = useOrganization()
    const [ombudsName, setOmbudsName] = React.useState<string>('')
    const navigate = useNavigate()

    React.useEffect(() => {
        if (!ombudsRes.data) return
        setOmbudsName(ombudsRes.data.name)
    }, [ombudsRes.data])

    return (
        <Box
            sx={{
                minHeight: '100%',
                boxSizing: 'border-box',
                bgcolor: '#F2F6F5',
                color: '#183337',
                p: { xs: 2, sm: 3, lg: 4 },
            }}
        >
            <Stack
                spacing={2.5}
                sx={{ width: '100%', maxWidth: 900, mx: 'auto' }}
            >
                <Box>
                    <Typography
                        variant="h4"
                        component="h1"
                        sx={{ color: '#183337', fontWeight: 700 }}
                    >
                        Profile
                    </Typography>
                    <Typography sx={{ mt: 0.5, color: '#647578' }}>
                        Your Ombuddi account and organization access.
                    </Typography>
                </Box>

                <RoundedContainer title="Personal information">
                    <TextField
                        value={ombudsName}
                        label="Name"
                        helperText="This name comes from your Ombuddi account."
                        fullWidth
                        slotProps={{ input: { readOnly: true } }}
                        sx={{
                            '& .MuiInputLabel-root': { color: '#536A6D' },
                            '& .MuiOutlinedInput-root': { color: '#183337', bgcolor: '#FFFFFF' },
                        }}
                    />
                </RoundedContainer>

                <Box
                    sx={{
                        p: 2.5,
                        display: 'flex',
                        flexDirection: { xs: 'column', sm: 'row' },
                        alignItems: { xs: 'stretch', sm: 'center' },
                        justifyContent: 'space-between',
                        gap: 2,
                        bgcolor: '#FFFFFF',
                        border: '1px solid #D7E1DF',
                        borderRadius: 3,
                    }}
                >
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                        <PersonOutlined sx={{ color: '#875C9B' }} />
                        <Box>
                            <Typography sx={{ color: '#183337', fontWeight: 700 }}>
                                {organization.name || 'Organization'}
                            </Typography>
                            <Typography
                                variant="body2"
                                sx={{ color: '#647578' }}
                            >
                                Manage codes, roles, people, and entry options.
                            </Typography>
                        </Box>
                    </Box>
                    <Button
                        onClick={() => navigate('/organization')}
                        variant="outlined"
                        endIcon={<ArrowForward />}
                        sx={{
                            color: '#2F6668',
                            borderColor: '#9FBBB8',
                            textTransform: 'none',
                            fontWeight: 700,
                            '&:hover': { borderColor: '#2F6668', bgcolor: '#EAF3F2' },
                        }}
                    >
                        Organization settings
                    </Button>
                </Box>
            </Stack>
        </Box>
    )
}
