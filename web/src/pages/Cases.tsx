import { pageLayoutStyle, pageTitleStyle } from '../theme/pageLayout'
import { Add, Commit } from '@mui/icons-material'
import { Alert, Box, Button, CircularProgress, Stack, Typography } from '@mui/material'
import React from 'react'
import { useNavigate } from 'react-router-dom'
import { CaseCard } from '../components/LoadAllCases/CaseCard'
import { institutionalPalette as palette } from '../theme/institutionalPalette'
import { useGetter } from '../tools/db_tools/useGetter'
import { CaseType } from '../types/majorTypes'
import { creator } from '../tools/db_tools/creator'
import { useSnack } from '../libraries/useSnack'

export function Cases() {
    const navigate = useNavigate()
    const activeRes = useGetter<CaseType[]>(['get_cases_by_status', 'active'])
    const generalRes = useGetter<CaseType | null>(['get_general_activity_case'])
    const monitoringRes = useGetter<CaseType[]>(['get_cases_by_status', 'monitoring'])
    const closedRes = useGetter<CaseType[]>(['get_cases_by_status', 'closed'])
    const setSnack = useSnack((state) => state.setSnack)
    const [openingGeneral, setOpeningGeneral] = React.useState(false)
    const cases = [
        ...(activeRes.data ?? []),
        ...(generalRes.data ? [generalRes.data] : []),
        ...(monitoringRes.data ?? []),
        ...(closedRes.data ?? []),
    ]
    const caseLoading = activeRes.isLoading || generalRes.isLoading || monitoringRes.isLoading || closedRes.isLoading
    const caseLoadError = activeRes.isError || generalRes.isError || monitoringRes.isError || closedRes.isError

    async function retryCases() {
        await Promise.all([activeRes.refetch(), generalRes.refetch(), monitoringRes.refetch(), closedRes.refetch()])
    }

    async function logGeneralActivity() {
        if (openingGeneral) return
        setOpeningGeneral(true)
        try {
            const general = await creator<{ id: string }>('general_activity_case', {})
            navigate(`/case/${general.id}/add_entry`)
        } catch (error) {
            setSnack({
                message: error instanceof Error ? error.message : 'Unable to open General activity.',
                severity: 'error',
            })
            setOpeningGeneral(false)
        }
    }

    return (
        <Box
            sx={{
                ...pageLayoutStyle,
                background: `linear-gradient(122deg, ${palette.background} 0%, ${palette.background} 76%, ${palette.backgroundDeep} 76%)`,
            }}
        >
            <Box
                sx={{
                    mb: 2.5,
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
                        variant="h4"
                        sx={pageTitleStyle}
                    >
                        Cases
                    </Typography>
                    <Typography sx={{ mt: 0.5, color: 'text.secondary' }}>
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
                        onClick={() => void logGeneralActivity()}
                        disabled={openingGeneral}
                        sx={{
                            color: palette.purpleLight,
                            borderColor: 'primary.light',
                            '&:hover': {
                                borderColor: palette.purpleLight,
                                bgcolor: 'action.hover',
                            },
                        }}
                    >
                        {openingGeneral ? (
                            <>
                                <CircularProgress
                                    size={15}
                                    color="inherit"
                                    sx={{ mr: 0.75 }}
                                />
                                Opening…
                            </>
                        ) : (
                            'Log general activity'
                        )}
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

            {caseLoadError && (
                <Alert
                    severity="error"
                    action={<Button onClick={() => void retryCases()}>Retry</Button>}
                    sx={{ mb: 2 }}
                >
                    Some case records could not be loaded.
                </Alert>
            )}

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

            {!cases.length && !caseLoading && !caseLoadError && (
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
    )
}
