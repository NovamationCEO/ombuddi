// @vitest-environment jsdom
import { act } from 'react'
import { createRoot } from 'react-dom/client'
import { expect, it, vi } from 'vitest'
import { ThemeProvider } from '@mui/material/styles'
import { appTheme } from '../theme/appTheme'
import { AdminUsers } from './AdminUsers'
;(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true
const mocks = vi.hoisted(() => ({ creator: vi.fn(), refetch: vi.fn().mockResolvedValue(undefined) }))
vi.mock('../tools/db_tools/creator', () => ({ creator: mocks.creator }))
vi.mock('../tools/db_tools/updater', () => ({ updater: vi.fn() }))
vi.mock('../tools/db_tools/useGetter', () => ({
    useGetter: (key: string[]) => ({
        data: key[1] === 'ombuds' ? [{ id: 'seat', name: 'Invitee', email: 'invitee@example.com',
            isActive: true, isLinked: false, isAdmin: false, invitation: null }] : null,
        isLoading: false, error: null, refetch: mocks.refetch,
    }),
}))
it('prevents duplicate requests and re-enables invitation after failure', async () => {
    let reject!: (error: Error) => void
    mocks.creator.mockReturnValue(new Promise((_, fail) => { reject = fail }))
    const container = document.createElement('div')
    const root = createRoot(container)
    await act(async () => root.render(<ThemeProvider theme={appTheme}><AdminUsers /></ThemeProvider>))
    const button = Array.from(container.querySelectorAll('button')).find(b => b.textContent === 'Create invitation')!
    await act(async () => { button.click(); button.click() })
    expect(mocks.creator).toHaveBeenCalledTimes(1)
    expect(button.disabled).toBe(true)
    await act(async () => reject(new Error('Connection unavailable')))
    expect(button.disabled).toBe(false)
    expect(container.textContent).toContain('Connection unavailable')
    await act(async () => root.unmount())
})
