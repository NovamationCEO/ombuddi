import { getToken } from '../auth/tokenProvider'
import { apiUrl } from '../../constants/apiUrl'

export async function creator<TReturn = unknown, TPayload = unknown>(address: string, payload: TPayload) {
    const token = await getToken()
    const requestOptions = {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
    }

    try {
        const response = await fetch(`${apiUrl}/api/v1/${address}`, requestOptions)
        const isJson = response.headers.get('content-type')?.includes('application/json')
        const data = isJson && (await response.json())

        if (!response.ok) {
            const error = (data && data.message) || response.status
            throw new Error(error)
        }

        return data as TReturn
    } catch (error) {
        console.error('There was an error!', error)
        throw error
    }
}
