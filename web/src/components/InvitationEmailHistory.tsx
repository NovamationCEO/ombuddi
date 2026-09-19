import { Alert, Button, Stack, Typography } from '@mui/material'
import { useGetter } from '../tools/db_tools/useGetter'
import { InvitationDelivery, type EmailDelivery } from './InvitationDelivery'

type EmailEvent = { id: string; createdAt: string; delivery: EmailDelivery & { invitationId: string } }
export function InvitationEmailHistory({ endpoint }: { endpoint: string[] }) {
    const history = useGetter<EmailEvent[]>(endpoint)
    return <Stack spacing={1}>
        <Typography variant="subtitle2">Email sending history (newest first)</Typography>
        <Button onClick={() => history.refetch()} disabled={history.isFetching}>Refresh email history</Button>
        {history.isLoading && <Typography>Loading email history…</Typography>}
        {history.error && <Alert severity="error">Unable to load email history.</Alert>}
        {!history.isLoading && !history.error && !history.data?.length && <Typography>Email status unavailable. No sending history has been recorded.</Typography>}
        {(history.data ?? []).map((event, index) => <Stack key={event.id} spacing={0.5}>
            <Typography variant="caption">{index === 0 ? 'Latest recorded status · ' : ''}{new Date(event.createdAt).toLocaleString()} · Invitation {event.delivery.invitationId}</Typography>
            <InvitationDelivery delivery={event.delivery} showLinkHint={false} />
        </Stack>)}
    </Stack>
}
