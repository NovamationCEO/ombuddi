// @vitest-environment jsdom

import React, { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { ThemeProvider } from '@mui/material/styles'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { AcceptInvitation } from './AcceptInvitation'
import { Profile } from './Profile'
import { appTheme } from '../theme/appTheme'
import { useSessionSalt } from '../libraries/useSessionSalt'
;(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true

const mocks = vi.hoisted(() => ({
    creator: vi.fn(),
    updater: vi.fn(),
    navigate: vi.fn(),
    loginWithRedirect: vi.fn(),
    setSnack: vi.fn(),
    refetchOmbuds: vi.fn(),
    refetchOrganization: vi.fn(),
    auth: {
        isAuthenticated: true,
        isLoading: false,
    },
    diagnostics: {
        authenticated: true,
        linked: true,
        accountActive: true,
        organizationActive: true,
        organizationClaimPresent: false,
        organizationClaimMatches: null,
        emailClaimPresent: true,
        emailVerified: true,
        emailClaimSource: 'namespaced',
        isOrganizationAdmin: false,
        isSystemAdmin: false,
        canAccessApplication: true,
        code: 'SESSION_READY',
        message: 'This session is accepted for normal Ombuddi access.',
    },
}))

vi.mock('@auth0/auth0-react', () => ({
    useAuth0: () => ({
        ...mocks.auth,
        loginWithRedirect: mocks.loginWithRedirect,
    }),
}))

vi.mock('react-router-dom', () => ({
    useNavigate: () => mocks.navigate,
}))

vi.mock('../tools/db_tools/creator', () => ({
    creator: mocks.creator,
}))

vi.mock('../tools/db_tools/updater', () => ({
    updater: mocks.updater,
}))

vi.mock('../tools/useCurrentOmbuds', () => ({
    useCurrentOmbuds: () => ({
        data: { id: 'ombuds-1', name: 'Invited User' },
        isLoading: false,
        error: null,
        refetch: mocks.refetchOmbuds,
    }),
}))

vi.mock('../tools/useOrganization', () => ({
    useOrganization: () => ({ id: 'org-1', name: 'Example Organization' }),
    useOrganizationResult: () => ({
        data: { id: 'org-1', name: 'Example Organization' },
        isLoading: false,
        error: null,
        refetch: mocks.refetchOrganization,
    }),
}))

vi.mock('../libraries/useSnack', () => ({
    useSnack: (selector: (state: { setSnack: typeof mocks.setSnack }) => unknown) =>
        selector({ setSnack: mocks.setSnack }),
}))

vi.mock('../tools/useSessionDiagnostics', () => ({
    useSessionDiagnostics: () => ({
        data: mocks.diagnostics,
        isLoading: false,
        error: null,
        refetch: vi.fn(),
    }),
}))

describe('invitation onboarding', () => {
    let container: HTMLDivElement
    let root: Root

    beforeEach(() => {
        container = document.createElement('div')
        document.body.appendChild(container)
        root = createRoot(container)
        mocks.creator.mockReset().mockResolvedValue({ success: true })
        mocks.updater.mockReset().mockResolvedValue({ success: true })
        mocks.navigate.mockReset()
        mocks.loginWithRedirect.mockReset()
        mocks.setSnack.mockReset()
        mocks.refetchOmbuds.mockReset().mockResolvedValue(undefined)
        mocks.refetchOrganization.mockReset().mockResolvedValue(undefined)
        mocks.auth.isAuthenticated = true
        mocks.auth.isLoading = false
        Object.assign(mocks.diagnostics, {
            authenticated: true,
            linked: true,
            accountActive: true,
            organizationActive: true,
            organizationClaimPresent: false,
            organizationClaimMatches: null,
            emailClaimPresent: true,
            emailVerified: true,
            emailClaimSource: 'namespaced',
            isOrganizationAdmin: false,
            isSystemAdmin: false,
            canAccessApplication: true,
            code: 'SESSION_READY',
            message: 'This session is accepted for normal Ombuddi access.',
        })
        useSessionSalt.getState().clearSessionSalt()
        window.sessionStorage.clear()
        window.history.replaceState({}, '', '/accept-invite?token=invite-token')
    })

    afterEach(async () => {
        await act(async () => root.unmount())
        container.remove()
    })

    it('claims the invitation automatically after authentication and opens the profile', async () => {
        await act(async () => {
            root.render(
                <React.StrictMode>
                    <ThemeProvider
                        theme={appTheme}
                        defaultMode="dark"
                    >
                        <AcceptInvitation />
                    </ThemeProvider>
                </React.StrictMode>,
            )
        })

        expect(mocks.creator).toHaveBeenCalledTimes(1)
        expect(mocks.creator).toHaveBeenCalledWith('auth/claim-invitation', { token: 'invite-token' })
        expect(mocks.navigate).toHaveBeenCalledWith('/profile', { replace: true })
        expect(window.sessionStorage.getItem('ombuddi.pendingInvitationToken')).toBeNull()
    })

    it('recovers the pending token after the Auth0 redirect removes it from the URL', async () => {
        window.sessionStorage.setItem('ombuddi.pendingInvitationToken', 'stored-invite-token')
        window.history.replaceState({}, '', '/accept-invite')

        await act(async () => {
            root.render(
                <ThemeProvider
                    theme={appTheme}
                    defaultMode="dark"
                >
                    <AcceptInvitation />
                </ThemeProvider>,
            )
        })

        expect(mocks.creator).toHaveBeenCalledWith('auth/claim-invitation', { token: 'stored-invite-token' })
        expect(mocks.navigate).toHaveBeenCalledWith('/profile', { replace: true })
    })

    it('sends a new invitee directly to Auth0 signup and offers an existing-account route', async () => {
        mocks.auth.isAuthenticated = false

        await act(async () => {
            root.render(
                <ThemeProvider
                    theme={appTheme}
                    defaultMode="dark"
                >
                    <AcceptInvitation />
                </ThemeProvider>,
            )
        })

        expect(container.textContent).toContain('Auth0 sends a separate email-verification message')
        const buttons = Array.from(container.querySelectorAll('button'))
        const signup = buttons.find((button) => button.textContent?.includes('Create account'))
        const login = buttons.find((button) => button.textContent?.includes('already have'))

        await act(async () => signup?.click())
        expect(mocks.loginWithRedirect).toHaveBeenLastCalledWith({
            appState: { returnTo: '/accept-invite?token=invite-token' },
            authorizationParams: { prompt: 'login', screen_hint: 'signup' },
        })

        await act(async () => login?.click())
        expect(mocks.loginWithRedirect).toHaveBeenLastCalledWith({
            appState: { returnTo: '/accept-invite?token=invite-token' },
            authorizationParams: { prompt: 'login' },
        })
    })

    it('keeps the token and shows a claim failure so the user can retry', async () => {
        mocks.creator.mockRejectedValueOnce(
            new Error('The signed-in Auth0 account does not match this invitation (INVITATION_EMAIL_MISMATCH)'),
        )

        await act(async () => {
            root.render(
                <ThemeProvider
                    theme={appTheme}
                    defaultMode="dark"
                >
                    <AcceptInvitation />
                </ThemeProvider>,
            )
        })

        expect(container.textContent).toContain('INVITATION_EMAIL_MISMATCH')
        expect(container.textContent).toContain('Try again')
        expect(window.sessionStorage.getItem('ombuddi.pendingInvitationToken')).toBe('invite-token')
        expect(mocks.navigate).not.toHaveBeenCalled()
    })

    it('explains verification recovery when Auth0 has not verified the invited email', async () => {
        mocks.creator.mockRejectedValueOnce(
            new Error('A verified Auth0 email is required to accept an invitation (VERIFIED_EMAIL_REQUIRED)'),
        )

        await act(async () => {
            root.render(
                <ThemeProvider
                    theme={appTheme}
                    defaultMode="dark"
                >
                    <AcceptInvitation />
                </ThemeProvider>,
            )
        })

        expect(container.textContent).toContain('email address is still awaiting verification')
        expect(container.textContent).toContain('I verified my email — sign in again')
        expect(window.sessionStorage.getItem('ombuddi.pendingInvitationToken')).toBe('invite-token')
    })

    it('shows the name and organization already recorded by the invitation administrator', async () => {
        await act(async () => {
            root.render(
                <ThemeProvider
                    theme={appTheme}
                    defaultMode="dark"
                >
                    <Profile />
                </ThemeProvider>,
            )
        })

        const values = Array.from(container.querySelectorAll('input')).map((input) => input.value)
        expect(values).toContain('Invited User')
        expect(values).not.toContain('Example Organization')
        expect(container.textContent).toContain('Example Organization')
    })

    it('allows the linked user to update their own name', async () => {
        await act(async () => {
            root.render(
                <ThemeProvider
                    theme={appTheme}
                    defaultMode="dark"
                >
                    <Profile />
                </ThemeProvider>,
            )
        })

        const nameInput = Array.from(container.querySelectorAll('input')).find(
            (input) => input.value === 'Invited User',
        ) as HTMLInputElement
        const valueSetter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set
        await act(async () => {
            valueSetter?.call(nameInput, 'Preferred Name')
            nameInput.dispatchEvent(new Event('input', { bubbles: true }))
        })

        const saveButton = Array.from(container.querySelectorAll('button')).find(
            (button) => button.textContent === 'Save name',
        )
        await act(async () => saveButton?.click())

        expect(mocks.updater).toHaveBeenCalledWith('update_current_ombuds', { name: 'Preferred Name' })
        expect(mocks.refetchOmbuds).toHaveBeenCalled()
        expect(mocks.setSnack).toHaveBeenCalledWith({ message: 'Name updated.', severity: 'success' })
    })

    it('shows appearance and session salt controls on the profile', async () => {
        useSessionSalt.getState().setSessionSalt('temporary phrase')

        await act(async () => {
            root.render(
                <ThemeProvider
                    theme={appTheme}
                    defaultMode="dark"
                >
                    <Profile />
                </ThemeProvider>,
            )
        })

        expect(container.querySelector('[aria-label="Dark mode"]')).not.toBeNull()
        expect(container.querySelector('[aria-label="Light mode"]')).not.toBeNull()
        expect((container.querySelector('input[type="password"]') as HTMLInputElement).value).toBe('temporary phrase')
        expect(container.textContent).toContain('cleared on refresh, login, or logout')
    })

    it('shows safe authenticated-session diagnostics', async () => {
        await act(async () => {
            root.render(
                <ThemeProvider
                    theme={appTheme}
                    defaultMode="dark"
                >
                    <Profile />
                </ThemeProvider>,
            )
        })

        expect(container.textContent).toContain('SESSION_READY')
        expect(container.textContent).toContain('Linked and active')
        expect(container.textContent).toContain('Not included (allowed)')
        expect(container.textContent).not.toContain('auth0|')
        expect(container.querySelector('#account-diagnostics-header')?.getAttribute('aria-expanded')).toBe('false')
        expect(container.textContent?.indexOf('Session security')).toBeLessThan(
            container.textContent?.indexOf('Account diagnostics') ?? 0,
        )
    })

    it('explains when a missing Auth0 email claim prevents invitation linking', async () => {
        Object.assign(mocks.diagnostics, {
            linked: false,
            accountActive: null,
            organizationActive: null,
            emailClaimPresent: false,
            emailVerified: false,
            emailClaimSource: 'missing',
            canAccessApplication: false,
            code: 'EMAIL_CLAIM_MISSING',
            message: 'The access token does not include an email identity.',
        })

        await act(async () => {
            root.render(
                <ThemeProvider
                    theme={appTheme}
                    defaultMode="dark"
                >
                    <Profile />
                </ThemeProvider>,
            )
        })

        expect(container.textContent).toContain('EMAIL_CLAIM_MISSING')
        expect(container.textContent).toContain('Signed email claimMissing')
        expect(container.textContent).toContain('Monitoring → Logs → Action Executions')
    })

    it('offers to complete a preserved invitation once the Auth0 email is verified', async () => {
        Object.assign(mocks.diagnostics, {
            linked: false,
            accountActive: null,
            organizationActive: null,
            emailClaimPresent: true,
            emailVerified: true,
            emailClaimSource: 'namespaced',
            canAccessApplication: false,
            code: 'ACCOUNT_NOT_LINKED',
            message: 'Return to your invitation link to finish linking the account.',
        })
        window.sessionStorage.setItem('ombuddi.pendingInvitationToken', 'stored-invite-token')

        await act(async () => {
            root.render(
                <ThemeProvider
                    theme={appTheme}
                    defaultMode="dark"
                >
                    <Profile />
                </ThemeProvider>,
            )
        })

        expect(container.textContent).toContain('Your Auth0 identity is ready')
        const complete = Array.from(container.querySelectorAll('button')).find((button) =>
            button.textContent?.includes('Complete pending invitation'),
        )
        await act(async () => complete?.click())
        expect(mocks.navigate).toHaveBeenCalledWith('/accept-invite')
    })
})
