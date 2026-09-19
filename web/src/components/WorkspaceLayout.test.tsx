// @vitest-environment jsdom
import { act } from 'react'
import { createRoot } from 'react-dom/client'
import { MemoryRouter, Routes, Route, useNavigate } from 'react-router-dom'
import { expect, it, vi } from 'vitest'
import { WorkspaceLayout } from './WorkspaceLayout'
;(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true
vi.mock('@auth0/auth0-react', () => ({ useAuth0: () => ({ isAuthenticated: true, isLoading: false }) }))
vi.mock('./AppRail', () => ({ AppRail: () => <nav>Navigation</nav> }))
vi.mock('../tools/useStyles', () => ({ useStyles: () => ({ contrast: 'black' }) }))
function Navigation() {
    const navigate = useNavigate()
    return (
        <>
            <button onClick={() => navigate('/profile')}>Profile</button>
            <button onClick={() => navigate(-1)}>Back</button>
        </>
    )
}
it('preserves the gradient and navigation while moving between routes and back', async () => {
    const host = document.createElement('div')
    document.body.append(host)
    const root = createRoot(host)
    try {
        await act(async () =>
            root.render(
                <MemoryRouter initialEntries={['/report']}>
                    <Navigation />
                    <Routes>
                        <Route element={<WorkspaceLayout />}>
                            <Route
                                path="/report"
                                element={<h1>Reports</h1>}
                            />
                            <Route
                                path="/profile"
                                element={<h1>Profile</h1>}
                            />
                        </Route>
                    </Routes>
                </MemoryRouter>,
            ),
        )
        const gradient = host.querySelector('[data-workspace-gradient]')!
        const reportClass = gradient.className
        const rail = host.querySelector('nav')
        await act(async () => (host.querySelector('button') as HTMLButtonElement).click())
        expect(host.querySelector('h1')?.textContent).toBe('Profile')
        expect(host.querySelector('[data-workspace-gradient]')).toBe(gradient)
        expect(host.querySelector('nav')).toBe(rail)
        expect(gradient.className).not.toBe(reportClass)
        await act(async () => (host.querySelectorAll('button')[1] as HTMLButtonElement).click())
        expect(host.querySelector('h1')?.textContent).toBe('Reports')
        expect(gradient.className).toBe(reportClass)
    } finally {
        await act(async () => root.unmount())
        host.remove()
    }
})
