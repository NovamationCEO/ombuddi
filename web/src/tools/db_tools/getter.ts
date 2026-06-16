import { getToken } from '../auth/tokenProvider'
import { apiUrl } from '../../constants/apiUrl'

export async function getter<T>(address: string) {
    const token = await getToken()
    const res = await fetch(`${apiUrl}/api/v1/${address}`, {
        headers: { Authorization: `Bearer ${token}` },
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
