import { useAuth0 } from '@auth0/auth0-react'
import { OmbudsType } from '../types/majorTypes'
import { useGetter } from './db_tools/useGetter'


export function useCurrentOmbuds(enabled = true) {
    const { isAuthenticated } = useAuth0()
    return useGetter<OmbudsType>([isAuthenticated && enabled ? 'get_current_ombuds' : undefined])
}
