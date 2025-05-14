import { OmbudsType, OrganizationType } from '../types/majorTypes'
import { useGetter } from './db_tools/useGetter'
import { useUserId } from './useUserId'

export function useOrganization(): OrganizationType {
    const userId = useUserId()
    const ombudRes = useGetter<OmbudsType>(['get_ombuds_by_id', userId])
    const organizationId = ombudRes.data?.organizationId
    const organizationRes = useGetter<OrganizationType>(['get_organization_by_id', organizationId])

    return organizationRes.data
}
