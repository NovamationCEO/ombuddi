import { Box, Stack } from '@mui/system'
import { RoundedContainer } from '../components/RoundedContainer'
import { TextField } from '@mui/material'
import React from 'react'
import { CodeSummary } from '../components/organization/CodeSummary'
import { useOrganization } from '../tools/useOrganization'
import { PrimaryRoles } from '../components/organization/PrimaryRoles'

export function Organization() {
    const [orgName, setOrgName] = React.useState<string>('')
    const organization = useOrganization()

    React.useEffect(() => {
        if (!organization) return
        setOrgName(organization.name)
    }, [organization])

    return (
        <Box>
            <Stack spacing={2}>
                <RoundedContainer title={'Organization - Basic Information'}>
                    <Stack spacing={2}>
                        <TextField
                            value={orgName}
                            onChange={(e) => setOrgName(e.target.value)}
                            label={'Name'}
                            fullWidth
                        />
                        <TextField
                            value={'Active'}
                            label={'License Status'}
                            disabled
                        />
                    </Stack>
                </RoundedContainer>
                <CodeSummary />
                <PrimaryRoles />
            </Stack>
        </Box>
    )
}
