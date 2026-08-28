import { Add, Commit } from '@mui/icons-material'
import { Box, Button, Stack, Typography } from '@mui/material'
import { useNavigate } from 'react-router-dom'
import { CaseCard } from '../components/LoadAllCases/CaseCard'
import { institutionalPalette as palette } from '../theme/institutionalPalette'
import { useGetter } from '../tools/db_tools/useGetter'
import { CaseType } from '../types/majorTypes'

export function Cases() {
    const navigate = useNavigate()
    const activeRes = useGetter<CaseType[]>(['get_cases_by_status', 'active'])
    const monitoringRes = useGetter<CaseType[]>(['get_cases_by_status', 'monitoring'])
    const closedRes = useGetter<CaseType[]>(['get_cases_by_status', 'closed'])
    const cases = [...(activeRes.data ?? []), ...(monitoringRes.data ?? []), ...(closedRes.data ?? [])]

    return (
        <Box
            sx={{
                minHeight: '100%',
                p: { xs: 3, sm: 4, lg: 5 },
                boxSizing: 'border-box',
                color: palette.text,
                background: `linear-gradient(122deg, ${palette.background} 0%, ${palette.background} 76%, ${palette.backgroundDeep} 76%)`,
            }}
        >
            <Box sx={{ maxWidth: 1360, mx: 'auto' }}>
                <Box
                    sx={{
                        mb: 3.5,
                        display: 'flex',
                        flexDirection: { xs: 'column', md: 'row' },
                        alignItems: { md: 'flex-start' },
                        justifyContent: 'space-between',
                        gap: 2.5,
                    }}
                >
                    <Box>
                        <Typography
                            component="h1"
                            sx={{
                                color: palette.text,
                                fontSize: { xs: '2.35rem', sm: '3rem' },
                                fontWeight: 650,
                                letterSpacing: '-0.045em',
                                lineHeight: 1.03,
                                mb: 1.25,
                            }}
                        >
                            Cases
                        </Typography>
                        <Typography sx={{ color: palette.muted }}>
                            Review and continue your confidential case work.
                        </Typography>
                    </Box>

                    <Stack
                        direction={{ xs: 'column-reverse', sm: 'row' }}
                        spacing={1.25}
                        sx={{ alignSelf: { xs: 'stretch', md: 'flex-start' } }}
                    >
                        <Button
                            variant="outlined"
                            startIcon={<Commit />}
                            onClick={() => navigate('/log_without_case')}
                            sx={{
                                color: palette.purpleLight,
                                borderColor: 'primary.light',
                                '&:hover': {
                                    borderColor: palette.purpleLight,
                                    bgcolor: 'action.hover',
                                },
                            }}
                        >
                            Log without case
                        </Button>
                        <Button
                            variant="contained"
                            startIcon={<Add />}
                            onClick={() => navigate('/add_case')}
                            sx={{
                                bgcolor: palette.purple,
                                color: 'primary.contrastText',
                                '&:hover': { bgcolor: palette.purpleDark },
                            }}
                        >
                            New case
                        </Button>
                    </Stack>
                </Box>

                <Box
                    sx={{
                        display: 'grid',
                        gridTemplateColumns: { xs: '1fr', xl: 'repeat(2, minmax(0, 1fr))' },
                        gap: 1.5,
                    }}
                >
                    {cases.map((caseItem) => (
                        <CaseCard
                            key={caseItem.id}
                            caseItem={caseItem}
                        />
                    ))}
                </Box>

                {!cases.length && activeRes.data && monitoringRes.data && closedRes.data && (
                    <Box
                        sx={{
                            p: 4,
                            textAlign: 'center',
                            color: palette.muted,
                            bgcolor: palette.surface,
                            border: `1px solid ${palette.border}`,
                            borderRadius: 3,
                        }}
                    >
                        <Typography
                            variant="h6"
                            sx={{ color: palette.text, mb: 0.75 }}
                        >
                            No cases yet
                        </Typography>
                        <Typography>Create a case when you are ready to begin recording work.</Typography>
                    </Box>
                )}
            </Box>
        </Box>
    )
}
