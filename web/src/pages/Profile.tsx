import { Box, Button, Stack, TextField } from '@mui/material'
import { useGetter } from '../tools/db_tools/useGetter'
import React from 'react'
import { OmbudsType, OrganizationType } from '../types/majorTypes'
import { RoundedContainer } from '../components/RoundedContainer'
import { useNavigate } from 'react-router-dom'
import { useUserId } from '../tools/useUserId'

export function Profile() {
    const userId = useUserId()
    const ombudsRes = useGetter<OmbudsType>(['get_ombuds_by_id', userId])
    const organizationId = ombudsRes.data?.organizationId
    const [ombudsName, setOmbudsName] = React.useState<string>('')
    const navigate = useNavigate()

    const orgRes = useGetter<OrganizationType>(['get_organization_by_id', organizationId])

    React.useEffect(() => {
        if (!ombudsRes.data) return
        setOmbudsName(ombudsRes.data.name)
    }, [ombudsRes.data])

    return (
        <Stack spacing={2}>
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
                View / Edit {orgRes?.data?.name || 'Organization'}
            </Button>
        </Stack>
    )
}
