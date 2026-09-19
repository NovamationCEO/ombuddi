// @vitest-environment jsdom
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ThemeProvider } from '@mui/material/styles'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { appTheme } from '../theme/appTheme'
import { AdminUsers } from './AdminUsers'
import { useSnack } from '../libraries/useSnack'
;(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true
const mocks = vi.hoisted(() => ({
    creator: vi.fn(),
    updater: vi.fn(),
    refetch: vi.fn(),
    orgRefetch: vi.fn(),
    metricsRefetch: vi.fn(),
    seatCount: 2,
}))
vi.mock('../tools/db_tools/updater', () => ({ updater: mocks.updater }))
vi.mock('../tools/db_tools/creator', () => ({ creator: mocks.creator }))
vi.mock('../tools/db_tools/useGetter', () => ({
    useGetter: (key: string[]) => ({
        data:
            key[1] === 'organization'
                ? { name: 'Example Office', subscriptionTier: 'alpha', seatCount: mocks.seatCount, seatLimit: 25 }
                : key[1] === 'metrics'
                  ? { entriesLast30Days: 12, entriesYtd: 30, openCases: 3, totalCases: 5 }
                  : key.length === 2
                    ? [
                          {
                              id: 'seat',
                              name: 'Invitee',
                              email: 'invitee@example.com',
                              isActive: true,
                              isLinked: false,
                              isAdmin: false,
                              invitation: { isActive: true },
                          },
                      ]
                    : [],
        refetch:
            key[1] === 'organization' ? mocks.orgRefetch : key[1] === 'metrics' ? mocks.metricsRefetch : mocks.refetch,
        isLoading: false,
        error: null,
    }),
}))
let root: Root
let host: HTMLDivElement
async function mount() {
    await act(async () =>
        root.render(
            <QueryClientProvider client={new QueryClient()}>
                <ThemeProvider theme={appTheme}>
                    <AdminUsers />
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
    mocks.seatCount = 2
    mocks.refetch.mockResolvedValue({})
    host = document.createElement('div')
    document.body.append(host)
    root = createRoot(host)
})
afterEach(async () => {
    await act(async () => root.unmount())
    host.remove()
})
async function submit() {
    await act(async () =>
        document.querySelector('form')!.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true })),
    )
}
it('combines seat capacity with usage and keeps creation inputs off the page', async () => {
    await mount()
    expect(host.textContent).toContain('Seats used')
    expect(host.textContent).toContain('Entries (30 days)')
    expect(host.textContent).not.toContain('Active seats')
    expect(document.querySelector('[role="progressbar"]')?.getAttribute('aria-valuenow')).toBe('8')
    expect(document.querySelector('input')).toBeNull()
    await click('Create user seat')
    expect(document.querySelector('[role="dialog"]')?.getAttribute('aria-labelledby')).toBe('create-seat-title')
    expect(input('Name')).toBeTruthy()
})
it('creates a seat from the modal and refreshes users and capacity without refetching metrics', async () => {
    mocks.creator.mockResolvedValue({})
    await mount()
    await click('Create user seat')
    await fill('Name', 'New User')
    await fill('Email', 'new@example.com')
    await submit()
    expect(mocks.creator).toHaveBeenCalledExactlyOnceWith('admin/ombuds', {
        name: 'New User',
        email: 'new@example.com',
        isAdmin: false,
    })
    expect(mocks.refetch).toHaveBeenCalledTimes(1)
    expect(mocks.orgRefetch).toHaveBeenCalledTimes(1)
    expect(mocks.metricsRefetch).not.toHaveBeenCalled()
    await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 250))
    })
    expect(document.querySelector('[role="dialog"]')).toBeNull()
})
it('keeps failed creation and entered values inside the modal', async () => {
    mocks.creator.mockRejectedValue(new Error('Seat could not be created'))
    await mount()
    await click('Create user seat')
    await fill('Name', 'New User')
    await fill('Email', 'new@example.com')
    await submit()
    expect(document.querySelector('[role="dialog"]')?.textContent).toContain('Seat could not be created')
    expect(input('Name').value).toBe('New User')
    expect(input('Email').value).toBe('new@example.com')
    expect(host.textContent).not.toContain('Seat could not be created')
})
it('disables creation at the seat limit', async () => {
    mocks.seatCount = 25
    await mount()
    const button = Array.from(document.querySelectorAll('button')).find((b) => b.textContent === 'Create user seat')!
    expect(button.disabled).toBe(true)
    expect(host.textContent).toContain('25-seat limit')
})
it('prevents duplicate submissions and dismissal during creation', async () => {
    let resolve!: (value: unknown) => void
    mocks.creator.mockReturnValue(
        new Promise((result) => {
            resolve = result
        }),
    )
    await mount()
    await click('Create user seat')
    await fill('Name', 'New User')
    await fill('Email', 'new@example.com')
    await submit()
    await submit()
    await act(async () => {
        document
            .querySelector('[role="dialog"]')!
            .dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }))
    })
    expect(document.querySelector('[role="dialog"]')).not.toBeNull()
    expect(mocks.creator).toHaveBeenCalledTimes(1)
    await act(async () => resolve({}))
})

it('shows status failure inside the dialog and beside the affected user', async () => {
    mocks.updater.mockRejectedValue(new Error('Cannot deactivate last administrator'))
    await mount()
    await click('Deactivate')
    await click('Deactivate', document.querySelector('[role="dialog"]')!)
    expect(document.querySelector('[role="dialog"]')?.textContent).toContain('Cannot deactivate last administrator')
    expect(host.textContent).toContain('Cannot deactivate last administrator')
    expect(useSnack.getState().snack).toEqual({ message: 'Cannot deactivate last administrator', severity: 'error' })
})
it('opens history in a labeled dialog', async () => {
    await mount()
    await click('Email history')
    expect(document.querySelector('[role="dialog"]')?.getAttribute('aria-labelledby')).toBe('email-history-title')
    expect(document.querySelector('[role="dialog"]')?.textContent).toContain('Email history — Invitee')
    expect(host.textContent).not.toContain('Email history — Invitee')
})
it('keeps invitation results in a dialog until explicitly acknowledged', async () => {
    mocks.creator.mockResolvedValue({ inviteUrl: 'https://example.com/secret' })
    await mount()
    await click('Replace invitation')
    await act(async () => {
        document
            .querySelector('[role="dialog"]')!
            .dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }))
        const backdrop = document.querySelector('.MuiDialog-container')!
        backdrop.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }))
        backdrop.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    })
    expect(input('Invitation link').value).toBe('https://example.com/secret')
    await click('Done')
    await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 250))
    })
    expect(document.querySelector('[role="dialog"]')).toBeNull()
})
it('serializes cancellation and other mutations and recovers after failure', async () => {
    let reject!: (error: Error) => void
    mocks.creator.mockReturnValue(
        new Promise((_, fail) => {
            reject = fail
        }),
    )
    await mount()
    const button = Array.from(document.querySelectorAll('button')).find((b) => b.textContent === 'Cancel invitation')!
    await act(async () => {
        button.click()
        button.click()
    })
    expect(mocks.creator).toHaveBeenCalledTimes(1)
    expect(button.disabled).toBe(true)
    await act(async () => reject(new Error('Cancellation failed')))
    expect(button.disabled).toBe(false)
    expect(button.closest('.MuiBox-root')?.parentElement?.textContent).toContain('Cancellation failed')
    expect(useSnack.getState().snack.message).toBe('Cancellation failed')
    await click('Create user seat')
    expect(host.textContent).not.toContain('Cancellation failed')
})
it('places email failures next to the user and emits a snackbar', async () => {
    mocks.updater.mockRejectedValue(new Error('Email already used'))
    await mount()
    await click('Edit email')
    await fill('Invitation email', 'other@example.com')
    await click('Save email')
    expect(host.textContent).toContain('Email already used')
    expect(input('Invitation email').value).toBe('other@example.com')
    expect(useSnack.getState().snack.message).toBe('Email already used')
})

it('refreshes only users after cancelling an invitation', async () => {
    mocks.creator.mockResolvedValue({})
    await mount()
    await click('Cancel invitation')
    expect(mocks.refetch).toHaveBeenCalledTimes(1)
    expect(mocks.orgRefetch).not.toHaveBeenCalled()
    expect(mocks.metricsRefetch).not.toHaveBeenCalled()
})
it('refreshes capacity after a status change without refetching metrics', async () => {
    mocks.updater.mockResolvedValue({})
    await mount()
    await click('Deactivate')
    await click('Deactivate', document.querySelector('[role="dialog"]')!)
    expect(mocks.refetch).toHaveBeenCalledTimes(1)
    expect(mocks.orgRefetch).toHaveBeenCalledTimes(1)
    expect(mocks.metricsRefetch).not.toHaveBeenCalled()
})
