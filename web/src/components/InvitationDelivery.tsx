import { Box } from '@mui/material'
import { deliveryText, type EmailDelivery } from './invitationDeliveryUtils'

export function InvitationDelivery({
    delivery,
    showLinkHint = true,
}: {
    delivery?: EmailDelivery
    showLinkHint?: boolean
}) {
    return (
        <Box>
            {deliveryText(delivery)}
            {delivery?.httpStatus && ` (HTTP ${delivery.httpStatus})`}
            {delivery?.auditWarning === 'outcome_not_saved' &&
                ' The final email status could not be saved. Check Microsoft message trace; do not assume sending failed.'}
            {showLinkHint && ' This link is shown only now; copy it if you need it.'}
        </Box>
    )
}
