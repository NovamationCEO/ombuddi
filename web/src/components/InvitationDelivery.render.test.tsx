// @vitest-environment jsdom
import { act } from 'react'
import { createRoot } from 'react-dom/client'
import { describe, expect, it } from 'vitest'
import { InvitationDelivery, invitationSeverity, type EmailDelivery } from './InvitationDelivery'
;(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true

describe('Invitation delivery feedback', () => {
    it.each([
        [{ status: 'failed', reason: 'token_refresh_busy' }, 'creating a replacement revokes the previous link', 'warning'],
        [undefined, 'status unavailable', 'warning'],
        [{ status: 'not_configured' }, 'sending is disabled', 'warning'],
        [{ status: 'started' }, 'If no later outcome appears', 'warning'],
        [{ status: 'failed', reason: 'audit_unavailable' }, 'audit record could not be saved', 'warning'],
        [{ status: 'accepted' }, 'Microsoft accepted', 'success'],
        [{ status: 'unconfirmed' }, 'could not be confirmed', 'warning'],
        [{ status: 'configuration_error', reason: 'invalid_configuration' }, 'HTTPS FRONTEND_URL', 'warning'],
        [{ status: 'failed', reason: 'authentication_failed' }, 'authentication failed', 'warning'],
        [{ status: 'rejected', reason: 'provider_rejected', httpStatus: 403 }, 'HTTP 403', 'warning'],
        [{ status: 'accepted', auditWarning: 'outcome_not_saved' }, 'final email status could not be saved', 'warning'],
    ] as const)('shows accurate feedback for %j', async (input, expected, severity) => {
        const delivery = input ? { sender: 'admin@ombuddi.com', ...input } as EmailDelivery : undefined
        const container = document.createElement('div')
        const root = createRoot(container)
        await act(async () => root.render(<InvitationDelivery delivery={delivery} />))
        expect(container.textContent).toContain(expected)
        expect(invitationSeverity(delivery)).toBe(severity)
        expect(container.textContent).not.toContain('successfully delivered')
        await act(async () => root.unmount())
    })
})
