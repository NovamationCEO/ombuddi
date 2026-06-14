import { OrganizationType } from '../types/majorTypes'
import { useGetter } from './db_tools/useGetter'
import keycloak from '../constants/keycloak'

export function useOrganization(): OrganizationType {
    const organizationId = keycloak.tokenParsed?.organization_id as string | undefined
    const organizationRes = useGetter<OrganizationType>(['get_organization_by_id', organizationId])
    return organizationRes.data || ({} as OrganizationType)
}
