import { useGetter } from './db_tools/useGetter'

export type SessionDiagnostics = {
    authenticated: boolean
    linked: boolean
    accountActive: boolean | null
    organizationActive: boolean | null
    organizationClaimPresent: boolean
    organizationClaimMatches: boolean | null
    emailClaimPresent: boolean
    emailVerified: boolean
    emailClaimSource: 'namespaced' | 'standard' | 'missing'
    isOrganizationAdmin: boolean
    isSystemAdmin: boolean
    canAccessApplication: boolean
    code: string
    message: string
}

export function useSessionDiagnostics() {
    return useGetter<SessionDiagnostics>(['auth', 'session-diagnostics'], false)
}
