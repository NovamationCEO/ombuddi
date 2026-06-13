import { Box, Stack } from '@mui/system'
import { RoundedContainer } from '../components/RoundedContainer'
import { Button, TextField } from '@mui/material'
import React from 'react'
import { CodeSummary } from '../components/organization/CodeSummary'
import { useOrganization } from '../tools/useOrganization'
import { PrimaryRoles } from '../components/organization/PrimaryRoles'
import { PicklistManager } from '../components/organization/PicklistManager'
import { PublicPersons } from '../components/organization/PublicPersons'
import { updater } from '../tools/db_tools/updater'
import { useQueryClient } from '@tanstack/react-query'
import { useSnack } from '../libraries/useSnack'
import { OrganizationType } from '../types/majorTypes'

export function Organization() {
    const [orgName, setOrgName] = React.useState<string>('')
    const [saving, setSaving] = React.useState(false)
    const organization = useOrganization()
    const queryClient = useQueryClient()
    const setSnack = useSnack((state) => state.setSnack)

    React.useEffect(() => {
        if (!organization) return
        setOrgName(organization.name)
    }, [organization])

    async function saveOrg() {
        if (!organization.id) return
        setSaving(true)
        try {
            await updater<OrganizationType>('update_organization', { id: organization.id, name: orgName })
            queryClient.invalidateQueries({ queryKey: ['get_organization_by_id', organization.id] })
            setSnack({ message: 'Organization saved.', severity: 'success' })
        } catch {
            setSnack({ message: 'Failed to save organization.', severity: 'error' })
        } finally {
            setSaving(false)
        }
    }

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
                        <Box>
                            <Button variant='contained' onClick={saveOrg} disabled={saving || !orgName.trim()}>
                                Save
                            </Button>
                        </Box>
                    </Stack>
                </RoundedContainer>
                <CodeSummary />
                <PrimaryRoles />
                <PublicPersons />
                <PicklistManager
                    kind={'medium'}
                    title={'Entry Mediums'}
                    singularNoun={'medium'}
                />
                <PicklistManager
                    kind={'priority'}
                    title={'Entry Priorities'}
                    singularNoun={'priority'}
                />
            </Stack>
        </Box>
    )
}
