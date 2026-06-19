export const auth0Domain = (import.meta.env.VITE_AUTH0_DOMAIN as string | undefined) ?? 'ombuddi.us.auth0.com'
export const auth0ClientId = (import.meta.env.VITE_AUTH0_CLIENT_ID as string | undefined) ?? 'Ojb681XQ1UzLJ6ewKvZtybOlfl1FRbjl'
export const auth0Audience = (import.meta.env.VITE_AUTH0_AUDIENCE as string | undefined) ?? ''

// Must match the namespace used in the Auth0 Post-Login Action and service/src/auth.py.
export const CLAIM_ORG_ID = 'https://ombuddi.com/organization_id'
