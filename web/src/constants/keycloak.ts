import Keycloak from 'keycloak-js'

const keycloakConfig = {
    url: 'https://localhost:5001/',
    realm: 'ombuddi',
    clientId: 'myclient',
}
const keycloak = new Keycloak(keycloakConfig)
export default keycloak
