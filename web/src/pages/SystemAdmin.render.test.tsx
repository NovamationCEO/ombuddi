// @vitest-environment jsdom
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { MemoryRouter, useLocation, useNavigate } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ThemeProvider } from '@mui/material/styles'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { appTheme } from '../theme/appTheme'
import { SystemAdmin } from './SystemAdmin'
import { Snack } from '../trusted-components/Snack'
import { useSnack } from '../libraries/useSnack'
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
    const snack = useSnack((state) => state.snack)
    return (
        <>
            <Snack snack={snack} />
            <button onClick={() => navigate('?org=org-1&tab=audit')}>Navigate to audit</button>
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
    vi.resetAllMocks()
    mocks.refetch.mockResolvedValue({})
    mocks.org.name = 'Example Office'
    useSnack.setState({ snack: { message: '' } })
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
    expect(document.querySelector('[data-location]')?.textContent).toBe('')
    expect(document.querySelector('[role="tablist"]')).toBeNull()
})
it('opens bookmarked settings and saves changes', async () => {
    mocks.updater.mockImplementation(async (_path, data) => {
        mocks.org.name = data.name
        return { success: true }
    })
    await mount('/system/orgs?org=org-1&tab=settings')
    expect(input('Name').value).toBe('Example Office')
    await fill('Name', 'Renamed Office')
    await click('Save')
    expect(mocks.updater).toHaveBeenCalledWith(
        'system/organizations/org-1',
        expect.objectContaining({ name: 'Renamed Office' }),
    )
    expect(document.querySelector('.MuiSnackbar-root')?.textContent).toContain('Organization settings saved')
    expect(host.textContent).not.toContain('Unsaved changes')
    await fill('Name', 'Another draft')
    expect(host.textContent).toContain('Unsaved changes')
    await click('Audit')
    await click('Settings')
    expect(input('Name').value).toBe('Another draft')
    expect(host.textContent).toContain('Unsaved changes')
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

async function attemptDismissDialog() {
    await act(async () => {
        document.querySelector('[role="dialog"]')!.dispatchEvent(
            new KeyboardEvent('keydown', {
                key: 'Escape',
                code: 'Escape',
                bubbles: true,
            }),
        )
        const container = document.querySelector('.MuiDialog-container')!
        container.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }))
        container.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    })
}
it('preserves unrelated parameters and replaces tab history', async () => {
    await mount('/system/orgs?filter=active')
    await click('Manage organization')
    await click('Settings')
    await click('Audit')
    expect(document.querySelector('[data-location]')?.textContent).toBe('?filter=active&org=org-1&tab=audit')
    await click('Browser back')
    expect(document.querySelector('[data-location]')?.textContent).toBe('?filter=active')
    await click('Manage organization')
    await click('Back to organizations')
    expect(document.querySelector('[data-location]')?.textContent).toBe('?filter=active')
})
it('shows seat failures beside the seat and in the shared snackbar', async () => {
    mocks.updater.mockRejectedValue(new Error('Seat could not be deactivated'))
    await mount('/system/orgs?org=org-1&tab=users')
    await click('Deactivate seat')
    const button = Array.from(document.querySelectorAll('button')).find((b) => b.textContent === 'Deactivate seat')!
    expect(button.parentElement?.parentElement?.textContent).toContain('Seat could not be deactivated')
    expect(document.querySelector('.MuiSnackbar-root')?.textContent).toContain('Seat could not be deactivated')
})
it('requires Done to dismiss a seat invitation and preserves it across tabs', async () => {
    mocks.creator.mockResolvedValue({ inviteUrl: 'https://example.com/secret' })
    await mount('/system/orgs?org=org-1&tab=users')
    await fill('User name', 'Draft user')
    await click('Create invitation')
    await attemptDismissDialog()
    expect(input('Invitation link').value).toBe('https://example.com/secret')
    await click('Navigate to audit')
    await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 250))
    })
    expect(document.querySelector('.MuiDialog-root:not([aria-hidden="true"]) [role="dialog"]')).toBeNull()
    await click('Users')
    expect(input('Invitation link').value).toBe('https://example.com/secret')
    await click('Done')
    await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 250))
    })
    expect(document.querySelector('[role="dialog"]')).toBeNull()
    expect(input('User name').value).toBe('Draft user')
})
it('requires Done to dismiss an organization invitation', async () => {
    mocks.creator.mockResolvedValue({ inviteUrl: 'https://example.com/new-org-secret' })
    await mount()
    await click('Create organization')
    await fill('Organization name', 'New Office')
    await fill('First administrator name', 'Admin')
    await fill('First administrator email', 'admin@example.com')
    await act(async () =>
        document.querySelector('form')!.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true })),
    )
    await attemptDismissDialog()
    expect(input('Invitation link').value).toBe('https://example.com/new-org-secret')
    await click('Done')
    await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 250))
    })
    expect(document.querySelector('[role="dialog"]')).toBeNull()
})
it('hides history dialogs on other tabs and restores them on return', async () => {
    await mount('/system/orgs?org=org-1&tab=users')
    await click('Invitation history')
    await click('Navigate to audit')
    await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 250))
    })
    expect(document.querySelector('.MuiDialog-root:not([aria-hidden="true"]) [role="dialog"]')).toBeNull()
    await click('Users')
    expect(document.querySelector('[role="dialog"]')?.textContent).toContain('Invitation history — Test User')
})
it('handles clipboard failures inside the invitation dialog', async () => {
    Object.defineProperty(navigator, 'clipboard', {
        configurable: true,
        value: { writeText: vi.fn().mockRejectedValue(new Error('Denied')) },
    })
    mocks.creator.mockResolvedValue({ inviteUrl: 'https://example.com/secret' })
    await mount('/system/orgs?org=org-1&tab=users')
    await click('Create invitation')
    await click('Copy invitation link')
    expect(document.querySelector('[role="dialog"]')?.textContent).toContain('Select and copy the invitation link')
    expect(input('Invitation link').value).toBe('https://example.com/secret')
})

it('retains an invitation that completes while another tab is active', async () => {
    let resolve!: (value: unknown) => void
    mocks.creator.mockReturnValue(
        new Promise((result) => {
            resolve = result
        }),
    )
    await mount('/system/orgs?org=org-1&tab=users')
    await click('Create invitation')
    await click('Audit')
    await act(async () => resolve({ inviteUrl: 'https://example.com/pending' }))
    expect(document.querySelector('[role="dialog"]')).toBeNull()
    await click('Users')
    expect(input('Invitation link').value).toBe('https://example.com/pending')
})

it.each(['Save', 'Deactivate organization'])('guards duplicate %s submissions', async (action) => {
    let resolve!: (value: unknown) => void
    mocks.updater.mockReturnValue(
        new Promise((done) => {
            resolve = done
        }),
    )
    await mount('/system/orgs?org=org-1&tab=settings')
    if (action === 'Deactivate organization') await click(action)
    const scope = action === 'Save' ? document : document.querySelector('[role="dialog"]')!
    const button = Array.from(scope.querySelectorAll('button')).find((b) => b.textContent === action)!
    await act(async () => {
        button.click()
        button.click()
    })
    expect(mocks.updater).toHaveBeenCalledTimes(1)
    await act(async () => resolve({}))
})
