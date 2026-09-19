import { Box } from '@mui/material'

export type EmailDelivery = {
    sender: string
    status: 'accepted' | 'not_configured' | 'unconfirmed' | 'configuration_error' | 'failed' | 'rejected'
    message?: string
    httpStatus?: number
    auditWarning?: string
}

export function InvitationDelivery({ delivery }: { delivery?: EmailDelivery }) {
    return <Box>
        {delivery?.status === 'accepted'
            ? `Microsoft accepted the invitation email from ${delivery.sender}. Delivery may take a moment.`
            : delivery?.message
                ? delivery.message
            : delivery?.status === 'unconfirmed'
                ? 'The invitation was created, but email delivery could not be confirmed. Check the sender’s Sent Items before sharing the link manually.'
                : 'Email delivery is not configured. Send this invitation from admin@ombuddi.com.'}
        {delivery?.httpStatus && ` (HTTP ${delivery.httpStatus})`}
        {delivery?.auditWarning && ` ${delivery.auditWarning}`}
        {' '}This link is shown only now; copy it if you need it.
    </Box>
}

export function invitationSeverity(delivery?: EmailDelivery): 'success' | 'warning' {
    return delivery?.status === 'accepted' && !delivery.auditWarning ? 'success' : 'warning'
}
