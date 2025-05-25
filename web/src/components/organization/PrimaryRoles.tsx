import { Stack } from '@mui/system'
import { RoundedContainer } from '../RoundedContainer'
import { useOrganization } from '../../tools/useOrganization'
import React from 'react'
import { PrimaryRoleType } from '../../types/majorTypes'
import { Box } from '@mui/material'
import { useGetter } from '../../tools/db_tools/useGetter'

export function PrimaryRoles() {
    const organization = useOrganization()
    const [roleList, setRoleList] = React.useState<PrimaryRoleType[]>([])
    const primaryRolesRes = useGetter<PrimaryRoleType[]>(['get_primary_roles_by_organization_id', organization.id])

    React.useEffect(() => {
        if (!primaryRolesRes.data) return
        setRoleList(primaryRolesRes.data)
    }, [primaryRolesRes.data])

    return (
        <RoundedContainer title={'Primary Roles'}>
            <Stack spacing={2}>
                {roleList.map((role) => (
                    <Box key={role.id}>
                        <span>{role.name}</span>
                    </Box>
                ))}
            </Stack>
        </RoundedContainer>
    )
}
