import { Box, Stack } from '@mui/system'
import { RoundedContainer } from '../components/RoundedContainer'
import { Button, TextField } from '@mui/material'
import React from 'react'
import { CodeSummary } from '../components/organization/CodeSummary'
import { useOrganization } from '../tools/useOrganization'
import { PrimaryRoles } from '../components/organization/PrimaryRoles'
import { PicklistManager, DefaultSet } from '../components/organization/PicklistManager'
import { PublicPersons } from '../components/organization/PublicPersons'
import { updater } from '../tools/db_tools/updater'
import { useQueryClient } from '@tanstack/react-query'
import { useSnack } from '../libraries/useSnack'
import { OrganizationType } from '../types/majorTypes'

const MEDIUM_SETS: DefaultSet[] = [
    {
        label: 'Standard',
        description: 'Common contact methods used by most ombuds offices.',
        items: [
            { name: 'In Person',       description: '' },
            { name: 'Phone',           description: '' },
            { name: 'Videoconference', description: '' },
            { name: 'Email',           description: '' },
            { name: 'Other',           description: '' },
        ],
    },
]

const PRIORITY_SETS: DefaultSet[] = [
    {
        label: 'Standard',
        description: 'Simple two-tier priority for distinguishing primary contacts from follow-ups.',
        items: [
            { name: 'Primary',   description: '' },
            { name: 'Secondary', description: '' },
        ],
    },
]

const GENDER_SETS: DefaultSet[] = [
    {
        label: 'Standard',
        description: 'A concise set covering the most common reporting categories.',
        items: [
            { name: 'N/A',        description: '' },
            { name: 'Male',       description: '' },
            { name: 'Female',     description: '' },
            { name: 'Non-Binary', description: '' },
            { name: 'Unknown',    description: '' },
        ],
    },
]

const GENERATION_SETS: DefaultSet[] = [
    {
        label: 'Standard',
        description: 'Pew Research generational definitions with birth-year tooltips.',
        items: [
            { name: 'Unknown',    description: '' },
            { name: 'Boomer',     description: 'Born 1946–1964' },
            { name: 'Gen X',      description: 'Born 1965–1980' },
            { name: 'Millennial', description: 'Born 1981–1996' },
            { name: 'Gen Z',      description: 'Born 1997–2012' },
            { name: 'Gen Alpha',  description: 'Born 2013–2025' },
        ],
    },
]

const RACE_SETS: DefaultSet[] = [
    {
        label: 'Standard',
        description: 'Categories broadly aligned with U.S. federal reporting guidelines.',
        items: [
            { name: 'Unknown',                                    description: '' },
            { name: 'Asian',                                      description: '' },
            { name: 'Black / African American / Afro-Caribbean', description: '' },
            { name: 'Native Hawaiian / Pacific Islander',         description: '' },
            { name: 'Hispanic of any Race',                       description: '' },
            { name: 'Native American / Alaskan Native',          description: '' },
            { name: 'White',                                      description: '' },
            { name: 'Multiracial',                               description: '' },
        ],
    },
]

export function Organization() {
    const [orgName, setOrgName] = React.useState<string>('')
    const [saving, setSaving] = React.useState(false)
    const organization = useOrganization()
    const queryClient = useQueryClient()
    const setSnack = useSnack((state) => state.setSnack)

    React.useEffect(() => {
        if (!organization?.name) return
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
        <Box sx={{ p: 1 }}>
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
                    defaultSets={MEDIUM_SETS}
                />
                <PicklistManager
                    kind={'priority'}
                    title={'Entry Priorities'}
                    singularNoun={'priority'}
                    defaultSets={PRIORITY_SETS}
                />
                <PicklistManager
                    kind={'gender'}
                    title={'Gender Options'}
                    singularNoun={'gender option'}
                    defaultSets={GENDER_SETS}
                />
                <PicklistManager
                    kind={'generation'}
                    title={'Generation Options'}
                    singularNoun={'generation option'}
                    defaultSets={GENERATION_SETS}
                />
                <PicklistManager
                    kind={'race'}
                    title={'Race / Ethnicity Options'}
                    singularNoun={'race option'}
                    defaultSets={RACE_SETS}
                />
            </Stack>
        </Box>
    )
}
