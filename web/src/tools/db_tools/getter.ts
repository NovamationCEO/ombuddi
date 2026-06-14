import keycloak from '../../constants/keycloak'

let host = window.location.host
host = host.includes('localhost') ? 'http://localhost:5002' : `https://${host}`

export async function getter<T>(address: string) {
    await keycloak.updateToken(30).catch(() => keycloak.login())
    const res = await fetch(`${host}/api/v1/${address}`, {
        headers: { Authorization: `Bearer ${keycloak.token}` },
    })

    if (!res.ok) {
        throw new Error('Network response was not ok.')
    }

    if (res.headers.get('content-type')?.includes('image/tiff')) {
        return (await res.blob()) as T
    }

    const json = await res.json()
    if (json.error) throw new Error(json.message)
    return json as T
}
