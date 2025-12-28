import { Box, Button, Paper, Stack } from '@mui/material'
import { useNavigate, useParams } from 'react-router-dom'
import { useGetter } from '../tools/db_tools/useGetter'
import { CaseType, EntryType } from '../types/majorTypes'
import { CodeChip } from '../components/CodeChip'
import Grid2 from '@mui/material/Unstable_Grid2'

export function CaseSummary() {
    const { caseId } = useParams()
    const caseRes = useGetter<CaseType>(['get_case_by_id', caseId])
    const navigate = useNavigate()

    const entriesRes = useGetter<EntryType[]>(['get_entries_by_case_id', caseId])

    return (
        <Box>
            <Paper
                elevation={2}
                sx={{ p: 2 }}
            >
                <Box display={'flex'}>
                    <Stack
                        spacing={1}
                        flex={2}
                    >
                        <Box fontWeight={'bold'}>{caseRes.data?.name}</Box>
                        {caseRes.data?.description?.length > 0 && (
                            <Box
                                p={1}
                                bgcolor={'whitesmoke'}
                            >
                                {caseRes.data?.description}
                            </Box>
                        )}
                    </Stack>
                    <Box
                        flex={1}
                        ml={2}
                        mr={2}
                        border={'1px solid lightgray'}
                        p={1}
                    >
                        <Box>Status: {caseRes.data?.status}</Box>
                        <Box>Created: {new Date(caseRes.data?.createdAt || '').toDateString()}</Box>
                        <Box>Updated: {new Date(caseRes.data?.updatedAt || '').toDateString()}</Box>
                    </Box>
                    <Box>
                        <Box
                            component={'img'}
                            src={`https://picsum.photos/seed/${caseRes.data?.id}/60/60`}
                            alt={caseRes.data?.name}
                            sx={{ width: '60px', height: '60px%', objectFit: 'cover' }}
                        />
                    </Box>
                </Box>
                <Box
                    m={2}
                    border={'1px solid gray'}
                    p={1}
                >
                    <Stack
                        spacing={1}
                        direction={'row'}
                    >
                        {caseRes.data?.codes?.map((code) => {
                            return (
                                <CodeChip
                                    key={code}
                                    code={code}
                                />
                            )
                        })}
                    </Stack>
                </Box>
                <Box m={2}>
                    <Grid2
                        container
                        spacing={2}
                    >
                        <Grid2
                            xs={12}
                            sm={6}
                        >
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
                                border={'1px solid black'}
                                p={2}
                            >
                                {!entriesRes.data?.length && <Box>No entries for this case yet.</Box>}
                            </Box>
                        </Grid2>
                        <Grid2
                            xs={12}
                            sm={6}
                        >
                            <Box
                                border={'1px solid black'}
                                p={2}
                            >
                                <Box>Date: </Box>
                                <Box>Contact Type: </Box>
                                <Box>Duration: </Box>
                                <Box>Notes: </Box>
                            </Box>
                        </Grid2>
                    </Grid2>
                </Box>
            </Paper>
        </Box>
    )
}
