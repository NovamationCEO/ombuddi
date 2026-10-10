// @vitest-environment jsdom
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { createMemoryRouter, matchRoutes, RouterProvider } from 'react-router-dom'
import { afterEach, beforeEach, expect, it } from 'vitest'
import { BadPage } from './BadPage'
import { router } from '../router'
;(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true
let host: HTMLDivElement
let root: Root
let previousHistoryState: unknown
beforeEach(() => {
    previousHistoryState = window.history.state
    host = document.createElement('div')
    document.body.append(host)
    root = createRoot(host)
})
afterEach(async () => {
    await act(async () => root.unmount())
    host.remove()
    window.history.replaceState(previousHistoryState, '')
})
async function renderPage(initialEntries: string[]) {
    const memoryRouter = createMemoryRouter(
        [
            { path: '/', element: <h1>Home destination</h1> },
            { path: '/previous', element: <h1>Previous destination</h1> },
            { path: '*', element: <BadPage /> },
        ],
        { initialEntries },
    )
    await act(async () => root.render(<RouterProvider router={memoryRouter} />))
    return memoryRouter
}
it('routes unknown URLs to a standalone page without intercepting known routes', () => {
    const matches = matchRoutes(router.routes, '/some/missing/page')!
    expect(matches).toHaveLength(1)
    expect(matches[0].route.path).toBe('*')
    expect(matchRoutes(router.routes, '/case/example/add_entry')?.slice(-1)[0]?.route.path).toBe('/case/:caseId/add_entry')
    expect(matchRoutes(router.routes, '/welcome')?.slice(-1)[0]?.route.path).toBe('/welcome')
})
it('shows the mascot, accessible message and home link, with no indexing', async () => {
    const memoryRouter = await renderPage(['/missing'])
    expect(host.querySelector('h1')?.textContent).toBe('Page not found: 404')
    expect(host.textContent).toContain('A little off the map.')
    expect(host.querySelector('img')?.alt).toContain('Ombuddi monster')
    expect(document.title).toBe('Page not found | Ombuddi')
    expect(document.querySelector('meta[name="robots"]')?.getAttribute('content')).toBe('noindex, nofollow')
    await act(async () => (host.querySelector('.not-found-home') as HTMLAnchorElement).click())
    expect(memoryRouter.state.location.pathname).toBe('/')
})
it('falls back home when a missing URL is opened directly', async () => {
    window.history.replaceState({ idx: 0 }, '')
    const memoryRouter = await renderPage(['/missing'])
    await act(async () => host.querySelector('button')?.click())
    expect(memoryRouter.state.location.pathname).toBe('/')
    expect(memoryRouter.state.historyAction).toBe('REPLACE')
})
it('returns to the previous app page when available', async () => {
    window.history.replaceState({ idx: 1 }, '')
    const memoryRouter = await renderPage(['/previous', '/missing'])
    await act(async () => host.querySelector('button')?.click())
    expect(memoryRouter.state.location.pathname).toBe('/previous')
})
