import keycloak from '../constants/keycloak'

export function useUserId(): string {
    return keycloak.tokenParsed?.sub ?? ''
}
