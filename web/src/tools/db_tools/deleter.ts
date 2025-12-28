import { GenericResponse } from '../../types/miscTypes'

let host = window.location.host
host = host.includes('localhost') ? 'http://localhost:5002' : `https://${host}`

export async function deleter(address: string, payload: { id?: string; ids?: string[] }) {
    const requestOptions = {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
    }

    try {
        const response = await fetch(`${host}/api/v1/${address}`, requestOptions)
        const isJson = response.headers.get('content-type')?.includes('application/json')
        const data = isJson && (await response.json())

        if (!response.ok) {
            const error = (data && data.message) || response.status
            throw new Error(error)
        }

        return data as GenericResponse
    } catch (error) {
        console.error('There was an error!', error)
        throw error
    }
}
