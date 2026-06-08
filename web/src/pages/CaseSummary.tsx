import { Box, Button, Chip, Paper, Stack } from '@mui/material'
import { useNavigate, useParams } from 'react-router-dom'
import { useGetter } from '../tools/db_tools/useGetter'
import { CaseType, EntryType, PersonType } from '../types/majorTypes'
import { CodeChip } from '../components/CodeChip'
import Grid2 from '@mui/material/Grid'
import React from 'react'
import { RoundButton } from '../trusted-components/RoundButton'
import { Edit } from '@mui/icons-material'
import { EditCodeDialog } from '../components/EditCodeDialog'

/** Compact demographic-only label for a Person chip (no identity). */
function personLabel(p: PersonType): string {
    const parts = [p.primaryRole, p.generation, p.gender].filter(
        (s) => s && s !== 'unknown' && s !== 'N/A',
    )
    return parts.length > 0 ? parts.join(' · ') : 'Unspecified'
}

export function CaseSummary() {
    const { caseId } = useParams()
    const caseRes = useGetter<CaseType>(['get_case_by_id', caseId])
    const navigate = useNavigate()
    const [highlightedId, setHighlightedId] = React.useState<string | null>(null)
    const [showEditCodes, setShowEditCodes] = React.useState(false)

    const entriesRes = useGetter<EntryType[]>(['get_entries_by_case_id', caseId])
    const highlightedPeopleRes = useGetter<PersonType[]>([
        'get_persons_by_entry_id',
        highlightedId ?? undefined,
    ])

    const highlightedEntry = React.useMemo(() => {
        if (!highlightedId) return null
        return entriesRes.data?.find((e) => e.id === highlightedId) ?? null
    }, [highlightedId, entriesRes.data])

    function mediumText(medium?: string) {
        if (!medium) return ''
        const mapping = {
            inPerson: 'In Person',
            phone: 'Phone',
            video: 'Videoconference',
            email: 'Email',
            other: 'Other',
        }

        return mapping[medium] || medium
    }

    function formatMinutes(minutes?: number) {
        if (!minutes) return ''
        const hrs = Math.floor(minutes / 60)
        const mins = minutes % 60
        if (hrs > 0) {
            return `${hrs} hr ${mins} min`
        }
        return `${mins} min`
    }

    return (
        <Box>
            <EditCodeDialog
                open={showEditCodes}
                onClose={() => {
                    setShowEditCodes(false)
                    caseRes.refetch()
                }}
            />
            <Paper
                elevation={2}
                sx={{ p: 2 }}
            >
                <Box
                    sx={{
                        display: 'flex',
                        flexDirection: { xs: 'column', sm: 'row' },
                        gap: 2,
                        alignItems: { xs: 'stretch', sm: 'flex-start' },
                    }}
                >
                    <Stack
                        spacing={1}
                        sx={{ flex: 2, minWidth: 0 }}
                    >
                        <Box sx={{
                            fontWeight: 'bold'
                        }}>{caseRes.data?.name}</Box>
                        {caseRes.data?.description?.length > 0 && (
                            <Box
                                sx={{
                                    p: 1,
                                    bgcolor: 'whitesmoke'
                                }}>
                                {caseRes.data?.description}
                            </Box>
                        )}
                    </Stack>
                    <Box
                        sx={{
                            flex: 1,
                            minWidth: 0,
                            border: '1px solid lightgray',
                            p: 1,
                        }}
                    >
                        <Box>
                            <b>Status:</b> {caseRes.data?.status}
                        </Box>
                        <Box>
                            <b>Created:</b> {new Date(caseRes.data?.createdAt || '').toDateString()}
                        </Box>
                        <Box>
                            <b>Updated:</b> {new Date(caseRes.data?.updatedAt || '').toDateString()}
                        </Box>
                    </Box>
                    <Box sx={{ display: 'flex', justifyContent: { xs: 'flex-start', sm: 'flex-end' } }}>
                        <Box
                            component={'img'}
                            src={`https://picsum.photos/seed/${caseRes.data?.id}/60/60`}
                            alt={caseRes.data?.name}
                            sx={{ width: '60px', height: 60, objectFit: 'cover' }}
                        />
                    </Box>
                </Box>
                <Box
                    sx={{
                        m: 2,
                        border: '1px solid gray',
                        p: 1
                    }}>
                    <Stack
                        direction="row"
                        sx={{ flexWrap: 'wrap', gap: 1, alignItems: 'center' }}
                    >
                        {caseRes.data?.codes?.map((code) => {
                            return (
                                <CodeChip
                                    key={code}
                                    code={code}
                                />
                            )
                        })}
                        <RoundButton
                            onClick={() => setShowEditCodes(true)}
                            size={27}
                        >
                            <Edit fontSize="small" />
                        </RoundButton>
                    </Stack>
                </Box>
                <Box sx={{
                    m: 2
                }}>
                    <Grid2
                        container
                        spacing={2}
                    >
                        <Grid2
                            size={{
                                xs: 12,
                                sm: 6
                            }}>
                            <Box>
                                <Button
                                    variant="contained"
                                    fullWidth
                                    onClick={() => navigate(`/case/${caseId}/add_entry`)}
                                >
                                    Add Entry
                                </Button>
                            </Box>
                            <Box
                                sx={{
                                    border: '1px solid black',
                                    p: 2
                                }}>
                                {!entriesRes.data?.length && <Box>No entries for this case yet.</Box>}
                                {entriesRes.data
                                    ?.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                                    .map((entry) => {
                                        const d = new Date(entry.date)
                                        return (
                                            <Box
                                                key={entry.id}
                                                onMouseEnter={() => setHighlightedId(entry.id)}
                                                // onMouseLeave={() => setHighlightedId(null)} // optional
                                                sx={{
                                                    cursor: 'default',
                                                    px: 1,
                                                    py: 0.5,
                                                    borderRadius: 1,
                                                    bgcolor:
                                                        highlightedId === entry.id ? 'action.hover' : 'transparent',
                                                    color: highlightedId === entry.id ? 'primary.main' : 'text.primary',
                                                }}
                                            >
                                                {d.toISOString().slice(0, 10)}
                                            </Box>
                                        )
                                    })}
                            </Box>
                        </Grid2>
                        <Grid2
                            size={{
                                xs: 12,
                                sm: 6
                            }}>
                            <Box
                                sx={{
                                    border: '1px solid black',
                                    p: 2,
                                    position: 'relative'
                                }}>
                                <Box>
                                    <b>Date:</b>{' '}
                                    {highlightedEntry ? new Date(highlightedEntry.date).toISOString().slice(0, 10) : ''}
                                </Box>
                                <Box>
                                    <b>Entry Method:</b> {highlightedEntry ? mediumText(highlightedEntry.medium) : ''}
                                </Box>
                                <Box>
                                    <b>Duration:</b> {highlightedEntry ? formatMinutes(highlightedEntry.duration) : ''}
                                </Box>
                                <Box>
                                    <b>Notes:</b> {highlightedEntry ? highlightedEntry.notes ?? '' : ''}
                                </Box>
                                {highlightedEntry && (
                                    <Box sx={{ mt: 1 }}>
                                        <b>Tags:</b>{' '}
                                        {(highlightedEntry.codes ?? []).length === 0 ? (
                                            <span>—</span>
                                        ) : (
                                            <Stack
                                                direction={'row'}
                                                sx={{ flexWrap: 'wrap', gap: 0.5, mt: 0.5 }}
                                            >
                                                {(highlightedEntry.codes ?? []).map((code) => (
                                                    <CodeChip
                                                        key={code}
                                                        code={code}
                                                    />
                                                ))}
                                            </Stack>
                                        )}
                                    </Box>
                                )}
                                {highlightedEntry && (
                                    <Box sx={{ mt: 1 }}>
                                        <b>People:</b>{' '}
                                        {(highlightedPeopleRes.data ?? []).length === 0 ? (
                                            <span>—</span>
                                        ) : (
                                            <Stack
                                                direction={'row'}
                                                sx={{ flexWrap: 'wrap', gap: 0.5, mt: 0.5 }}
                                            >
                                                {(highlightedPeopleRes.data ?? []).map((p) => (
                                                    <Chip
                                                        key={p.id}
                                                        size={'small'}
                                                        label={personLabel(p)}
                                                    />
                                                ))}
                                            </Stack>
                                        )}
                                    </Box>
                                )}
                            </Box>
                        </Grid2>
                    </Grid2>
                </Box>
            </Paper>
        </Box>
    );
}
