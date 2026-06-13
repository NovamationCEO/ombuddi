let host = window.location.host
host = host.includes('localhost') ? 'http://localhost:5002' : `https://${host}`

export async function creator<TReturn = unknown, TPayload = unknown>(address: string, payload: TPayload) {
    const requestOptions = {
        method: 'POST',
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

        return data as TReturn
    } catch (error) {
        console.error('There was an error!', error)
        throw error // Ensure errors are thrown to be catchable by caller
    }
}
