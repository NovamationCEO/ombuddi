import { Alert, Box, Button, Stack, Typography } from '@mui/material'
import { useGetter } from '../tools/db_tools/useGetter'
import { RoundedContainer } from './RoundedContainer'

type AuditEvent = {
    id: string
    eventType: string
    reason: string | null
    details: Record<string, unknown>
    createdAt: string
    actor: { id: string; name: string; email: string | null }
    target: { id: string; name: string; email: string | null } | null
}

function eventLabel(eventType: string) {
    return eventType
        .replace(/^ombuds_/, '')
        .replace(/^organization_/, 'organization ')
        .replaceAll('_', ' ')
        .replace(/^./, (letter) => letter.toUpperCase())
}

function detailText(details: Record<string, unknown>) {
    const values: string[] = []
    function visit(value: unknown, path: string) {
        if (value && typeof value === 'object' && !Array.isArray(value)) {
            Object.entries(value).forEach(([key, child]) => visit(child, path ? `${path} ${key}` : key))
            return
        }
        if (value !== null && value !== '') {
            values.push(`${path.replaceAll(/([A-Z])/g, ' $1').toLowerCase()}: ${String(value)}`)
        }
    }
    visit(details, '')
    return values.join(' · ')
}

export function SystemOrganizationAudit({ organizationId }: { organizationId: string }) {
    const audit = useGetter<AuditEvent[]>(['system', 'organizations', organizationId, 'audit'])
    return (
        <Stack spacing={2}>
            <RoundedContainer title="Administrative audit log">
                <Stack spacing={1}>
                    <Button
                        onClick={() => audit.refetch()}
                        disabled={audit.isFetching}
                    >
                        Refresh audit log
                    </Button>
                    {audit.isLoading && <Typography>Loading audit log…</Typography>}
                    {audit.error && <Alert severity="error">Unable to load audit log.</Alert>}

                    {(audit.data ?? []).map((event) => {
                        const details = detailText(event.details)
                        return (
                            <Box
                                key={event.id}
                                sx={{ p: 1, borderBottom: 1, borderColor: 'divider' }}
                            >
                                <Typography
                                    variant="body2"
                                    sx={{ fontWeight: 600 }}
                                >
                                    {eventLabel(event.eventType)}
                                    {event.target ? ` — ${event.target.name}` : ''}
                                </Typography>
                                <Typography
                                    variant="caption"
                                    color="text.secondary"
                                >
                                    {new Date(event.createdAt).toLocaleString()} · by {event.actor.name}
                                    {event.reason ? ` · ${event.reason}` : ''}
                                </Typography>
                                {details && (
                                    <Typography
                                        variant="caption"
                                        sx={{ display: 'block' }}
                                    >
                                        {details}
                                    </Typography>
                                )}
                            </Box>
                        )
                    })}
                    {!audit.isLoading && !audit.error && (audit.data?.length ?? 0) === 0 && (
                        <Typography color="text.secondary">No administrative events recorded yet.</Typography>
                    )}
                </Stack>
            </RoundedContainer>
        </Stack>
    )
}
