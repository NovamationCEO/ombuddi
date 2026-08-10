import { OrganizationType } from '../types/majorTypes'
import { useGetter } from './db_tools/useGetter'

export function useOrganization(): OrganizationType {
    const organizationRes = useGetter<OrganizationType>(['get_current_organization'])
    return organizationRes.data || ({} as OrganizationType)
}
