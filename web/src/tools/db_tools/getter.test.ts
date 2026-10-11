import { afterEach, describe, expect, it, vi } from 'vitest'
import { getter } from './getter'

vi.mock('../auth/tokenProvider', () => ({ getToken: async () => 'test-token' }))
afterEach(() => vi.unstubAllGlobals())

function respond(body: unknown, status = 200) {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify(body), {
        status,
        headers: { 'Content-Type': 'application/json' },
    })))
}

describe('getter', () => {
    it('accepts a successful null response when no General activity record exists yet', async () => {
        respond(null)
        await expect(getter('get_general_activity_case')).resolves.toBeNull()
    })

    it('returns successful case records unchanged', async () => {
        const cases = [{ id: 'case-1', name: 'Example' }]
        respond(cases)
        await expect(getter('get_cases_by_status/active')).resolves.toEqual(cases)
    })

    it('still rejects application errors in successful HTTP responses', async () => {
        respond({ error: 'Database error', message: 'Unable to load General activity' })
        await expect(getter('get_general_activity_case')).rejects.toThrow('Unable to load General activity')
    })

    it('still rejects failed HTTP requests', async () => {
        respond({ error: 'Unauthorized' }, 401)
        await expect(getter('get_general_activity_case')).rejects.toThrow('Network response was not ok.')
    })
})
