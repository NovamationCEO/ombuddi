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
                bgcolor: 'background.default',
                color: 'text.primary',
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
                        sx={{ color: 'text.primary', fontWeight: 700 }}
                    >
                        Profile
                    </Typography>
                    <Typography sx={{ mt: 0.5, color: 'text.secondary' }}>
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
                            '& .MuiInputLabel-root': { color: 'text.secondary' },
                            '& .MuiOutlinedInput-root': { color: 'text.primary', bgcolor: 'background.paper' },
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
                        bgcolor: 'background.paper',
                        border: '1px solid',
                        borderColor: 'divider',
                        borderRadius: 3,
                    }}
                >
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                        <PersonOutlined sx={{ color: 'primary.main' }} />
                        <Box>
                            <Typography sx={{ color: 'text.primary', fontWeight: 700 }}>
                                {organization.name || 'Organization'}
                            </Typography>
                            <Typography
                                variant="body2"
                                sx={{ color: 'text.secondary' }}
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
                            color: 'secondary.main',
                            borderColor: 'secondary.light',
                            textTransform: 'none',
                            fontWeight: 700,
                            '&:hover': { borderColor: 'secondary.main', bgcolor: 'action.hover' },
                        }}
                    >
                        Organization settings
                    </Button>
                </Box>
            </Stack>
        </Box>
    )
}
