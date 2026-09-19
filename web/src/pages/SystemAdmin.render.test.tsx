// @vitest-environment jsdom
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { MemoryRouter, useLocation, useNavigate } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ThemeProvider } from '@mui/material/styles'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { appTheme } from '../theme/appTheme'
import { SystemAdmin } from './SystemAdmin'
;(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true
const mocks = vi.hoisted(() => ({
    creator: vi.fn(),
    updater: vi.fn(),
    refetch: vi.fn().mockResolvedValue({}),
    org: {
        id: 'org-1',
        name: 'Example Office',
        subscriptionTier: 'alpha',
        seatLimit: 25,
        seatCount: 1,
        totalSeatCount: 1,
        linkedCount: 1,
        isActive: true,
    },
}))
vi.mock('../tools/db_tools/creator', () => ({ creator: mocks.creator }))
vi.mock('../tools/db_tools/updater', () => ({ updater: mocks.updater }))
vi.mock('../tools/db_tools/useGetter', () => ({
    useGetter: (key: string[]) => ({
        data:
            key.length === 2
                ? [mocks.org]
                : key[key.length - 1] === 'ombuds'
                  ? [
                        {
                            id: 'seat-1',
                            name: 'Test User',
                            email: 'user@example.com',
                            isActive: true,
                            isLinked: false,
                            isAdmin: false,
                            isSystemAdmin: false,
                            invitation: null,
                        },
                    ]
                  : [],
        isLoading: false,
        isFetching: false,
        error: null,
        refetch: mocks.refetch,
    }),
}))
let root: Root
let host: HTMLDivElement
function NavigationProbe() {
    const location = useLocation()
    const navigate = useNavigate()
    return (
        <>
            <output data-location>{location.search}</output>
            <button onClick={() => navigate(-1)}>Browser back</button>
        </>
    )
}
async function mount(url = '/system/orgs') {
    await act(async () =>
        root.render(
            <QueryClientProvider client={new QueryClient()}>
                <ThemeProvider theme={appTheme}>
                    <MemoryRouter initialEntries={[url]}>
                        <SystemAdmin />
                        <NavigationProbe />
                    </MemoryRouter>
                </ThemeProvider>
            </QueryClientProvider>,
        ),
    )
}
async function click(text: string, scope: ParentNode = document) {
    await act(async () =>
        Array.from(scope.querySelectorAll('button'))
            .find((button) => button.textContent === text)!
            .click(),
    )
}
function input(label: string) {
    const element = Array.from(document.querySelectorAll('label')).find((item) => item.textContent?.startsWith(label))!
    return document.getElementById(element.htmlFor) as HTMLInputElement
}
async function fill(label: string, value: string) {
    await act(async () => {
        const field = input(label)
        Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!.call(field, value)
        field.dispatchEvent(new Event('input', { bubbles: true }))
    })
}
beforeEach(() => {
    vi.clearAllMocks()
    host = document.createElement('div')
    document.body.append(host)
    root = createRoot(host)
})
afterEach(async () => {
    await act(async () => root.unmount())
    host.remove()
})
it('opens URL-backed tabs and supports browser back', async () => {
    await mount()
    expect(document.querySelector('[role="tablist"]')).toBeNull()
    expect(document.querySelector('input')).toBeNull()
    await click('Manage organization')
    expect(document.querySelector('[data-location]')?.textContent).toBe('?org=org-1&tab=users')
    await click('Audit')
    expect(document.querySelector('#org-panel-users')?.hasAttribute('hidden')).toBe(true)
    expect(document.querySelector('#org-panel-audit')?.textContent).toContain('No administrative events')
    await click('Browser back')
    expect(document.querySelector('[aria-selected="true"]')?.textContent).toBe('Users')
    await click('Back to organizations')
    expect(document.querySelector('[role="tablist"]')).toBeNull()
})
it('opens bookmarked settings and saves changes', async () => {
    mocks.updater.mockResolvedValue({ success: true })
    await mount('/system/orgs?org=org-1&tab=settings')
    expect(input('Name').value).toBe('Example Office')
    await fill('Name', 'Renamed Office')
    await click('Save')
    expect(mocks.updater).toHaveBeenCalledWith(
        'system/organizations/org-1',
        expect.objectContaining({ name: 'Renamed Office' }),
    )
    expect(host.textContent).toContain('Organization settings saved')
})
it('keeps organization creation and its result inside the modal', async () => {
    mocks.creator.mockResolvedValue({
        organizationId: 'org-2',
        inviteUrl: 'https://example.com/invite?token=test',
        emailDelivery: { sender: 'admin@ombuddi.com', status: 'accepted' },
    })
    await mount()
    await click('Create organization')
    await fill('Organization name', 'New Office')
    await fill('First administrator name', 'Admin')
    await fill('First administrator email', 'admin@example.com')
    await act(async () =>
        document.querySelector('form')!.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true })),
    )
    const dialog = document.querySelector('[role="dialog"]')!
    expect(dialog.textContent).toContain('Organization created')
    expect(dialog.textContent).toContain('Microsoft accepted')
    expect(host.textContent).not.toContain('Microsoft accepted')
    await click('Done', dialog)
})
it('keeps creation errors and entered data in the modal', async () => {
    mocks.creator.mockRejectedValue(new Error('Organization already exists'))
    await mount()
    await click('Create organization')
    await fill('Organization name', 'Existing Office')
    await fill('First administrator name', 'Admin')
    await fill('First administrator email', 'admin@example.com')
    await act(async () =>
        document.querySelector('form')!.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true })),
    )
    expect(document.querySelector('[role="dialog"]')?.textContent).toContain('Organization already exists')
    expect(input('Organization name').value).toBe('Existing Office')
})
it('handles an unknown organization', async () => {
    await mount('/system/orgs?org=missing&tab=users')
    expect(host.textContent).toContain('Organization not found')
    expect(document.querySelector('[role="tablist"]')).toBeNull()
})

it('preserves settings drafts while switching tabs', async () => {
    await mount('/system/orgs?org=org-1&tab=settings')
    await fill('Name', 'Unsaved name')
    await click('Audit')
    await click('Settings')
    expect(input('Name').value).toBe('Unsaved name')
})
it('opens invitation history in a labeled dialog', async () => {
    await mount('/system/orgs?org=org-1&tab=users')
    await click('Invitation history')
    const dialog = document.querySelector('[role="dialog"]')!
    expect(dialog.getAttribute('aria-labelledby')).toBe('invitation-history-title')
    expect(dialog.textContent).toContain('Invitation history — Test User')
    expect(dialog.textContent).toContain('Email sending history')
    await click('Close history', dialog)
})
it('shows a seat invitation result in a dialog', async () => {
    mocks.creator.mockResolvedValue({
        inviteUrl: 'https://example.com/invite',
        emailDelivery: { status: 'accepted', sender: 'admin@ombuddi.com' },
    })
    await mount('/system/orgs?org=org-1&tab=users')
    await click('Create invitation')
    expect(document.querySelector('[role="dialog"]')?.textContent).toContain('Microsoft accepted')
    expect(host.textContent).not.toContain('Microsoft accepted')
})
