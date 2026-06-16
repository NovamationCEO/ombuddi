import { auth0Audience } from '../../constants/auth0Config'

type TokenGetter = (opts: { authorizationParams: { audience: string } }) => Promise<string>

let _getter: TokenGetter | null = null

export function initTokenGetter(fn: TokenGetter): void {
    _getter = fn
}

export async function getToken(): Promise<string> {
    if (!_getter) throw new Error('Auth not initialized — Auth0Provider not yet mounted')
    return _getter({ authorizationParams: { audience: auth0Audience } })
}
