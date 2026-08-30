import { OrganizationType } from '../types/majorTypes'
import { useGetter } from './db_tools/useGetter'

export function useOrganizationResult() {
    return useGetter<OrganizationType>(['get_current_organization'])
}

export function useOrganization(): OrganizationType {
    const organizationRes = useOrganizationResult()
    return organizationRes.data || ({} as OrganizationType)
}
