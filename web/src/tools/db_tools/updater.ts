import keycloak from '../../constants/keycloak'

let host = window.location.host
host = host.includes('localhost') ? 'http://localhost:5002' : `https://${host}`

export type UpdateResponse = {
    message: string
    error?: string
}

export async function updater<T>(address: string, payload: Partial<T>) {
    await keycloak.updateToken(30).catch(() => keycloak.login())
    const requestOptions = {
        method: 'PUT',
        headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${keycloak.token}`,
        },
        body: JSON.stringify(payload),
    }

    try {
        if (!payload || (Array.isArray(payload) && !payload.length)) return { message: 'No payload to update.' }
        const response = await fetch(`${host}/api/v1/${address}`, requestOptions)
        const isJson = response.headers.get('content-type')?.includes('application/json')
        const data = isJson && (await response.json())

        if (!response.ok) {
            const error = (data && data.message) || response.status
            throw new Error(error)
        }

        return data as UpdateResponse
    } catch (error) {
        console.error('There was an error!', error)
        throw error
    }
}
