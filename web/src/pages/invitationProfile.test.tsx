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
    navigate: vi.fn(),
    loginWithRedirect: vi.fn(),
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

vi.mock('../tools/useCurrentOmbuds', () => ({
    useCurrentOmbuds: () => ({ data: { name: 'Invited User' } }),
}))

vi.mock('../tools/useOrganization', () => ({
    useOrganization: () => ({ id: 'org-1', name: 'Example Organization' }),
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
        mocks.navigate.mockReset()
        mocks.loginWithRedirect.mockReset()
        mocks.auth.isAuthenticated = true
        mocks.auth.isLoading = false
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
                    <ThemeProvider theme={appTheme} defaultMode="dark">
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
                <ThemeProvider theme={appTheme} defaultMode="dark">
                    <AcceptInvitation />
                </ThemeProvider>,
            )
        })

        expect(mocks.creator).toHaveBeenCalledWith('auth/claim-invitation', { token: 'stored-invite-token' })
        expect(mocks.navigate).toHaveBeenCalledWith('/profile', { replace: true })
    })

    it('keeps the token and shows a claim failure so the user can retry', async () => {
        mocks.creator.mockRejectedValueOnce(
            new Error('The signed-in Auth0 account does not match this invitation (INVITATION_EMAIL_MISMATCH)'),
        )

        await act(async () => {
            root.render(
                <ThemeProvider theme={appTheme} defaultMode="dark">
                    <AcceptInvitation />
                </ThemeProvider>,
            )
        })

        expect(container.textContent).toContain('INVITATION_EMAIL_MISMATCH')
        expect(container.textContent).toContain('Try again')
        expect(window.sessionStorage.getItem('ombuddi.pendingInvitationToken')).toBe('invite-token')
        expect(mocks.navigate).not.toHaveBeenCalled()
    })

    it('shows the name and organization already recorded by the invitation administrator', async () => {
        await act(async () => {
            root.render(
                <ThemeProvider theme={appTheme} defaultMode="dark">
                    <Profile />
                </ThemeProvider>,
            )
        })

        const values = Array.from(container.querySelectorAll('input')).map((input) => input.value)
        expect(values).toContain('Invited User')
        expect(values).toContain('Example Organization')
    })

    it('shows appearance and session salt controls on the profile', async () => {
        useSessionSalt.getState().setSessionSalt('temporary phrase')

        await act(async () => {
            root.render(
                <ThemeProvider theme={appTheme} defaultMode="dark">
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
                <ThemeProvider theme={appTheme} defaultMode="dark">
                    <Profile />
                </ThemeProvider>,
            )
        })

        expect(container.textContent).toContain('SESSION_READY')
        expect(container.textContent).toContain('Linked and active')
        expect(container.textContent).toContain('Not included (allowed)')
        expect(container.textContent).not.toContain('auth0|')
    })
})
