import React from 'react'
import { Add, ArrowForward, Close, Commit, Search } from '@mui/icons-material'
import {
    Alert,
    Box,
    Button,
    ButtonBase,
    CircularProgress,
    Drawer,
    IconButton,
    InputAdornment,
    MenuItem,
    Stack,
    TextField,
    ToggleButton,
    ToggleButtonGroup,
    Typography,
    useMediaQuery,
} from '@mui/material'
import { ThemeProvider } from '@mui/material/styles'
import { useNavigate } from 'react-router-dom'
import { CaseCard } from '../components/LoadAllCases/CaseCard'
import { CaseInspection } from '../components/LoadAllCases/CaseInspection'
import { pageLayoutStyle, pageTitleStyle } from '../theme/pageLayout'
import { caseFolderTheme } from '../theme/caseFolderTheme'
import { useGetter } from '../tools/db_tools/useGetter'
import { useResolvedCaseCodes } from '../tools/useResolvedCaseCodes'
import type { CaseType } from '../types/majorTypes'
import { creator } from '../tools/db_tools/creator'
import { useSnack } from '../libraries/useSnack'

const statuses = ['active', 'monitoring', 'closed', 'all'] as const
type CaseStatus = (typeof statuses)[number]

export function Cases() {
    const navigate = useNavigate()
    const activeRes = useGetter<CaseType[]>(['get_cases_by_status', 'active'])
    const generalRes = useGetter<CaseType | null>(['get_general_activity_case'])
    const monitoringRes = useGetter<CaseType[]>(['get_cases_by_status', 'monitoring'])
    const closedRes = useGetter<CaseType[]>(['get_cases_by_status', 'closed'])
    const setSnack = useSnack((state) => state.setSnack)
    const [openingGeneral, setOpeningGeneral] = React.useState(false)
    const [status, setStatus] = React.useState<CaseStatus>('active')
    const [search, setSearch] = React.useState('')
    const [sort, setSort] = React.useState('updated')
    const [selectedId, setSelectedId] = React.useState<string | null>(null)
    const [mobileInspection, setMobileInspection] = React.useState(false)
    const desktop = useMediaQuery('(min-width:1200px)')
    const allCases = [...(activeRes.data ?? []), ...(monitoringRes.data ?? []), ...(closedRes.data ?? [])]
    const results = {
        active: activeRes,
        monitoring: monitoringRes,
        closed: closedRes,
        all: {
            data: allCases,
            isLoading: activeRes.isLoading || monitoringRes.isLoading || closedRes.isLoading,
            isError: activeRes.isError || monitoringRes.isError || closedRes.isError,
        },
    }
    const query = search.trim().toLocaleLowerCase()
    const current = results[status]
    const allCodeIds = [...new Set(allCases.flatMap((item) => item.codes ?? []))]
    const resolvedCodes = useResolvedCaseCodes(allCodeIds)
    const codeNames = new Map(resolvedCodes.map((code) => [code.id, code.shortName]))
    const cases = (current.data ?? [])
        .filter(
            (item) =>
                !query ||
                [item.name, ...(item.themes ?? []), ...(item.codes ?? []).map((id) => codeNames.get(id) ?? '')].some(
                    (value) => value.toLocaleLowerCase().includes(query),
                ),
        )
        .sort((a, b) =>
            sort === 'name'
                ? a.name.localeCompare(b.name)
                : sort === 'oldest'
                  ? +new Date(a.updatedAt) - +new Date(b.updatedAt)
                  : +new Date(b.updatedAt) - +new Date(a.updatedAt),
        )
    const selected = cases.find((item) => item.id === selectedId) ?? cases[0]
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

    function inspect(item: CaseType) {
        setSelectedId(item.id)
        if (!desktop) setMobileInspection(true)
    }

    const inspection = selected && (
        <CaseInspection
            key={selected.id}
            caseItem={selected}
            onOpen={() => navigate(`/case/${selected.id}`)}
        />
    )

    return (
        <Box sx={pageLayoutStyle}>
            <Stack
                direction={{ xs: 'column', sm: 'row' }}
                spacing={2}
                sx={{ justifyContent: 'space-between', alignItems: { sm: 'center' }, mb: 2 }}
            >
                <Box>
                    <Typography
                        component="h1"
                        variant="h4"
                        sx={pageTitleStyle}
                    >
                        Cases
                    </Typography>
                    <Typography sx={{ mt: 0.5, color: 'text.secondary', fontSize: '.85rem' }}>
                        Select a folder for a quick look.
                    </Typography>
                </Box>
                <Stack
                    direction="row"
                    spacing={1}
                >
                    <Button
                        size="small"
                        variant="outlined"
                        startIcon={openingGeneral ? <CircularProgress size={15} /> : <Commit />}
                        disabled={openingGeneral}
                        sx={{ whiteSpace: 'nowrap' }}
                        onClick={() => void logGeneralActivity()}
                    >
                        {openingGeneral ? 'Opening…' : 'Log general activity'}
                    </Button>
                    <Button
                        size="small"
                        variant="contained"
                        sx={{ whiteSpace: 'nowrap', flexShrink: 0 }}
                        startIcon={<Add />}
                        onClick={() => navigate('/add_case')}
                    >
                        New case
                    </Button>
                </Stack>
            </Stack>

            <Stack
                direction="row"
                useFlexGap
                spacing={1.5}
                sx={{ flexWrap: 'wrap', alignItems: 'center', mb: 2.5 }}
            >
                <ToggleButtonGroup
                    value={status}
                    exclusive
                    size="small"
                    aria-label="Case status"
                    onChange={(_, next: CaseStatus | null) => {
                        if (next) {
                            setStatus(next)
                            setSelectedId(null)
                            setMobileInspection(false)
                        }
                    }}
                >
                    {statuses.map((value) => (
                        <ToggleButton
                            key={value}
                            value={value}
                            aria-label={`${value[0].toUpperCase()}${value.slice(1)} cases`}
                            sx={{
                                textTransform: 'none',
                                gap: 0.5,
                                px: { xs: 0.75, sm: 1.25 },
                                fontSize: { xs: '.72rem', sm: '.8125rem' },
                            }}
                        >
                            {value[0].toUpperCase()}
                            {value.slice(1)}{' '}
                            <Box
                                component="span"
                                sx={{ fontSize: '.7rem', borderRadius: 3, px: 0.75, bgcolor: 'action.hover' }}
                            >
                                {results[value].isLoading ? '…' : (results[value].data?.length ?? '—')}
                            </Box>
                        </ToggleButton>
                    ))}
                </ToggleButtonGroup>
                <TextField
                    size="small"
                    label={`Search ${status} cases`}
                    placeholder="Names, codes or themes"
                    value={search}
                    onChange={(event) => {
                        setSearch(event.target.value)
                        setMobileInspection(false)
                    }}
                    sx={{ ml: { lg: 'auto' }, flex: '1 1 230px', maxWidth: { sm: 360 } }}
                    slotProps={{
                        input: {
                            startAdornment: (
                                <InputAdornment position="start">
                                    <Search fontSize="small" />
                                </InputAdornment>
                            ),
                            endAdornment: search ? (
                                <InputAdornment position="end">
                                    <IconButton
                                        size="small"
                                        aria-label="Clear search"
                                        onClick={() => {
                                            setSearch('')
                                            setMobileInspection(false)
                                        }}
                                        edge="end"
                                    >
                                        <Close fontSize="small" />
                                    </IconButton>
                                </InputAdornment>
                            ) : undefined,
                        },
                    }}
                />
                <TextField
                    select
                    size="small"
                    label="Sort"
                    value={sort}
                    onChange={(event) => setSort(event.target.value)}
                    sx={{ minWidth: 165 }}
                >
                    <MenuItem value="updated">Updated: newest</MenuItem>
                    <MenuItem value="oldest">Updated: oldest</MenuItem>
                    <MenuItem value="name">Case name</MenuItem>
                </TextField>
            </Stack>

            {query && (
                <Box
                    role="status"
                    sx={{
                        mb: 2.5,
                        mt: -1,
                        px: 1.5,
                        py: 0.75,
                        borderLeft: '3px solid',
                        borderColor: 'primary.main',
                        bgcolor: 'action.selected',
                        borderRadius: 0.5,
                        overflowWrap: 'anywhere',
                    }}
                >
                    <Typography variant="body2">
                        <strong>Search applied:</strong> “{search.trim()}” ·{' '}
                        {current.isLoading
                            ? 'Searching'
                            : `${cases.length} ${cases.length === 1 ? 'match' : 'matches'} in`}{' '}
                        {status} cases
                    </Typography>
                </Box>
            )}

            {caseLoadError && (
                <Alert
                    severity="error"
                    action={<Button onClick={() => void retryCases()}>Retry</Button>}
                    sx={{ mb: 2 }}
                >
                    Some case records could not be loaded.
                </Alert>
            )}

            <ThemeProvider theme={caseFolderTheme}>
                {generalRes.data && (
                    <ButtonBase
                        className="case-general-memo"
                        onClick={() => navigate(`/case/${generalRes.data!.id}`)}
                    >
                        <Commit fontSize="small" />
                        <strong>General activity</strong>
                        <Box
                            component="span"
                            sx={{ display: { xs: 'none', sm: 'inline' } }}
                        >
                            One-off and cross-cutting work
                        </Box>
                        <ArrowForward sx={{ ml: 'auto', fontSize: 17 }} />
                    </ButtonBase>
                )}
                <div className="case-workspace">
                    <div>
                        {current.isLoading && (
                            <Box
                                role="status"
                                sx={{ p: 4, textAlign: 'center' }}
                            >
                                <CircularProgress size={24} />
                                <Typography>Loading cases…</Typography>
                            </Box>
                        )}
                        <div
                            className="case-file-grid"
                            aria-label={`${status} cases`}
                        >
                            {cases.map((item) => (
                                <CaseCard
                                    key={item.id}
                                    caseItem={item}
                                    selected={selected?.id === item.id}
                                    onSelect={() => inspect(item)}
                                />
                            ))}
                        </div>
                        {!cases.length && !current.isLoading && !current.isError && (
                            <Box
                                sx={{
                                    p: 4,
                                    bgcolor: '#fff',
                                    border: '1px solid #e2dfd5',
                                    boxShadow: '0 2px 5px #59432215',
                                }}
                            >
                                <Typography variant="h6">
                                    {query
                                        ? 'No matching cases'
                                        : status === 'all'
                                          ? 'No cases yet'
                                          : `No ${status} cases`}
                                </Typography>
                                <Typography
                                    variant="body2"
                                    sx={{ mt: 0.5 }}
                                >
                                    {query
                                        ? 'Try another name, code or theme, choose a different status, or clear the search.'
                                        : status === 'active' || status === 'all'
                                          ? 'Create a case when you are ready to begin recording work.'
                                          : `Cases marked ${status} will appear here.`}
                                </Typography>
                            </Box>
                        )}
                    </div>
                    {desktop && (
                        <aside
                            className="case-inspection-sticky"
                            aria-label="Case inspection"
                        >
                            <h2 className="case-inspection-label">Quick look</h2>
                            {inspection ?? (
                                <Box
                                    sx={{ p: 3, bgcolor: '#fff', color: 'text.secondary', border: '1px solid #e2dfd5' }}
                                >
                                    Select a case to see its summary, codes and themes.
                                </Box>
                            )}
                        </aside>
                    )}
                </div>
                {!desktop && (
                    <Drawer
                        anchor="right"
                        open={mobileInspection && !!selected}
                        onClose={() => setMobileInspection(false)}
                        slotProps={{ paper: { sx: { width: 'min(100%, 460px)' } } }}
                    >
                        <div className="case-inspection-mobile">
                            <Stack
                                direction="row"
                                sx={{ alignItems: 'center', justifyContent: 'space-between', mb: 1.5 }}
                            >
                                <Typography
                                    variant="h6"
                                    component="h2"
                                >
                                    Quick look
                                </Typography>
                                <IconButton
                                    aria-label="Close quick look"
                                    onClick={() => setMobileInspection(false)}
                                >
                                    <Close />
                                </IconButton>
                            </Stack>
                            {inspection}
                        </div>
                    </Drawer>
                )}
            </ThemeProvider>
        </Box>
    )
}
