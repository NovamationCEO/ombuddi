import Keycloak from 'keycloak-js'

const keycloakConfig = {
    url: (import.meta.env.VITE_KEYCLOAK_URL as string | undefined)?.replace(/\/$/, '') ?? 'http://localhost:5001',
    realm: 'ombuddi',
    clientId: 'myclient',
}
const keycloak = new Keycloak(keycloakConfig)
export default keycloak
