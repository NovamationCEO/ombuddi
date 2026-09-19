// @vitest-environment jsdom
import { act } from 'react'
import { createRoot } from 'react-dom/client'
import { describe, expect, it } from 'vitest'
import { InvitationDelivery, invitationSeverity, type EmailDelivery } from './InvitationDelivery'
;(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true

describe('Invitation delivery feedback', () => {
    it.each([
        [undefined, 'not configured', 'warning'],
        [{ status: 'not_configured' }, 'not configured', 'warning'],
        [{ status: 'accepted' }, 'Microsoft accepted', 'success'],
        [{ status: 'unconfirmed' }, 'could not be confirmed', 'warning'],
        [{ status: 'configuration_error', message: 'Configure HTTPS.' }, 'Configure HTTPS.', 'warning'],
        [{ status: 'failed', message: 'Authentication failed.' }, 'Authentication failed.', 'warning'],
        [{ status: 'rejected', message: 'Microsoft rejected.', httpStatus: 403 }, 'HTTP 403', 'warning'],
        [{ status: 'accepted', auditWarning: 'Audit unavailable.' }, 'Audit unavailable.', 'warning'],
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
