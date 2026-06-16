import { OrganizationType } from '../types/majorTypes'
import { useGetter } from './db_tools/useGetter'
import { useAuth0 } from '@auth0/auth0-react'
import { CLAIM_ORG_ID } from '../constants/auth0Config'

export function useOrganization(): OrganizationType {
    const { user } = useAuth0()
    const organizationId = user?.[CLAIM_ORG_ID] as string | undefined
    const organizationRes = useGetter<OrganizationType>(['get_organization_by_id', organizationId])
    return organizationRes.data || ({} as OrganizationType)
}
