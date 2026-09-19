import { Box } from '@mui/material'

export type EmailDelivery = {
    sender: string
    status: 'started' | 'accepted' | 'not_configured' | 'unconfirmed' | 'configuration_error' | 'failed' | 'rejected'
    reason?: 'invalid_configuration' | 'authentication_failed' | 'provider_rejected' | 'submission_unknown' | 'audit_unavailable'
    httpStatus?: number
    auditWarning?: 'outcome_not_saved'
}

export function deliveryText(delivery?: EmailDelivery): string {
    if (!delivery) return 'Email status unavailable.'
    if (delivery.reason === 'audit_unavailable') return 'Email was not sent because its audit record could not be saved. The invitation link remains valid.'
    switch (delivery.status) {
        case 'accepted': return `Microsoft accepted the invitation email from ${delivery.sender}. Inbox delivery is not confirmed.`
        case 'started': return 'A sending attempt was recorded. If no later outcome appears, check Microsoft message trace before sending again.'
        case 'not_configured': return 'Email sending is disabled. Send this invitation from admin@ombuddi.com.'
        case 'configuration_error': return 'Email was not sent. Configure the Microsoft credentials and an HTTPS FRONTEND_URL.'
        case 'failed': return 'Email was not sent. Microsoft authentication failed; check credentials and service connectivity.'
        case 'rejected': return 'Microsoft rejected the email. Check mailbox permissions and service limits.'
        case 'unconfirmed': return 'Email submission could not be confirmed. Check Sent Items or Microsoft message trace before sending again.'
        default: return 'Email status unavailable.'
    }
}

export function InvitationDelivery({ delivery, showLinkHint = true }: { delivery?: EmailDelivery; showLinkHint?: boolean }) {
    return <Box>
        {deliveryText(delivery)}
        {delivery?.httpStatus && ` (HTTP ${delivery.httpStatus})`}
        {delivery?.auditWarning === 'outcome_not_saved' && ' The final email status could not be saved. Check Microsoft message trace; do not assume sending failed.'}
        {showLinkHint && ' This link is shown only now; copy it if you need it.'}
    </Box>
}

export function invitationSeverity(delivery?: EmailDelivery): 'success' | 'warning' {
    return delivery?.status === 'accepted' && !delivery.auditWarning ? 'success' : 'warning'
}
