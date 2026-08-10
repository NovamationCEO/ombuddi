import { Box, Button, Stack, TextField } from '@mui/material'
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
        <Stack spacing={2} sx={{ p: 1 }}>
            <Box>Profile</Box>

            <RoundedContainer title={'Profile'}>
                <Box>
                    <TextField
                        value={ombudsName}
                        onChange={(e) => setOmbudsName(e.target.value)}
                        label={'Name'}
                    />
                </Box>
            </RoundedContainer>

            <Button
                onClick={() => navigate('/organization')}
                variant={'contained'}
            >
                View / Edit {organization.name || 'Organization'}
            </Button>
        </Stack>
    )
}
