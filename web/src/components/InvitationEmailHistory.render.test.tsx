// @vitest-environment jsdom
import { act } from 'react'
import { createRoot } from 'react-dom/client'
import { describe, expect, it, vi } from 'vitest'
import { InvitationEmailHistory } from './InvitationEmailHistory'
;(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true
const mocks = vi.hoisted(() => ({ get: vi.fn(), refetch: vi.fn() }))
vi.mock('../tools/db_tools/useGetter', () => ({ useGetter: mocks.get }))

describe('Stored email history', () => {
    it.each([
        [{ data: [], isLoading: false }, 'No sending history'],
        [{ data: undefined, isLoading: true }, 'Loading email history'],
        [{ error: new Error('failed') }, 'Unable to load email history'],
        [{ data: [{ id: 'event', createdAt: '2026-09-19T10:00:00Z', delivery: {
            status: 'accepted', sender: 'admin@ombuddi.com', invitationId: 'invite',
        } }] }, 'Latest recorded status'],
    ])('renders persisted state %j', async (state, expected) => {
        mocks.get.mockReturnValue({ ...state, refetch: mocks.refetch })
        const container = document.createElement('div')
        const root = createRoot(container)
        await act(async () => root.render(<InvitationEmailHistory endpoint={['admin', 'ombuds', 'seat', 'email-history']} />))
        expect(mocks.get).toHaveBeenCalledWith(['admin', 'ombuds', 'seat', 'email-history'])
        expect(container.textContent).toContain(expected)
        expect(container.textContent).not.toContain('This link is shown only now')
        if ('error' in state) expect(container.textContent).not.toContain('No sending history')
        await act(async () => container.querySelector('button')!.click())
        expect(mocks.refetch).toHaveBeenCalled()
        await act(async () => root.unmount())
    })
})
