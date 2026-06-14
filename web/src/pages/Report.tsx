import { Box, IconButton, InputAdornment, Stack, TextField, ToggleButton, ToggleButtonGroup, Tooltip, Typography } from '@mui/material'
import Grid2 from '@mui/material/Grid'
import React from 'react'
import Highcharts from 'highcharts'
import HighchartsReactOfficial from 'highcharts-react-official'
// highcharts-react-official ships CJS; Vite wraps it in an object at runtime
const HighchartsReact = (HighchartsReactOfficial as any).default ?? HighchartsReactOfficial
import { useQuery } from '@tanstack/react-query'
import { useOrganization } from '../tools/useOrganization'
import { BarChart, Lock, PieChart, Share } from '@mui/icons-material'
import { ioaCodesById } from '../constants/ioaConstants'
// Side-effect imports: highcharts.js sets window._Highcharts in CJS mode, so
// these modules self-register against it on evaluation. No function call needed.
// Offline exporting keeps all chart data in-browser — nothing reaches export.highcharts.com.
import 'highcharts/modules/exporting'
import 'highcharts/modules/offline-exporting'
import 'highcharts/modules/export-data'
Highcharts.setOptions({
    exporting: {
        fallbackToExportServer: false,
        buttons: { contextButton: { menuItems: ['downloadPNG', 'downloadPDF', 'separator', 'downloadCSV'] } },
    },
})

const host = window.location.host.includes('localhost')
    ? 'http://localhost:5002'
    : `https://${window.location.host}`

type CodeRow = { codeId: string; codeLabel: string | null; count?: number; totalMinutes?: number }

type ReportData = {
    entriesByMonth: { month: string; count: number }[]
    durationByMonth: { month: string; totalMinutes: number }[]
    casesByMonth: { month: string; count: number }[]
    personsByMonth: { month: string; uniquePersons: number; totalAppearances: number }[]
    personsByRace: { race: string; count: number }[]
    entriesByMedium: { medium: string; count: number }[]
    avgDurationByMedium: { medium: string; avgMinutes: number }[]
    personsByRole: { role: string; count: number }[]
    personsByGeneration: { generation: string; count: number }[]
    casesByStatus: { status: string; count: number }[]
    codesByCaseCount: CodeRow[]
    codesByDuration: CodeRow[]
    codesByEntryCount: CodeRow[]
}

function resolveCodeLabel(row: CodeRow): string {
    if (row.codeLabel) return row.codeLabel
    return ioaCodesById.get(row.codeId)?.code ?? row.codeId.slice(0, 8)
}

function defaultRange() {
    const end = new Date()
    const start = new Date(end)
    start.setFullYear(start.getFullYear() - 1)
    return {
        start: start.toISOString().slice(0, 10),
        end: end.toISOString().slice(0, 10),
    }
}

/**
 * In shareable mode, merge any bucket below minSize into "Other" so that
 * small groups can't be used to infer individual identity.
 */
function suppressSmallBuckets(
    categories: string[],
    data: number[],
    minSize: number,
): { categories: string[]; data: number[] } {
    let otherTotal = 0
    const kept: { label: string; value: number }[] = []

    categories.forEach((label, i) => {
        if (data[i] < minSize) {
            otherTotal += data[i]
        } else {
            kept.push({ label, value: data[i] })
        }
    })

    if (otherTotal > 0) {
        const existingOther = kept.find(k => k.label === 'Other')
        if (existingOther) {
            existingOther.value += otherTotal
        } else {
            kept.push({ label: 'Other', value: otherTotal })
        }
    }

    return {
        categories: kept.map(k => k.label),
        data: kept.map(k => k.value),
    }
}

function colOptions(
    title: string,
    categories: string[],
    series: Highcharts.SeriesOptionsType[],
    yTitle: string,
    showLegend = false,
): Highcharts.Options {
    return {
        chart: { type: 'column', height: 360, animation: false },
        title: { text: title, style: { fontSize: '13px', fontWeight: '600' } },
        xAxis: { categories, labels: { rotation: -45, style: { fontSize: '10px' } } },
        yAxis: { title: { text: yTitle, style: { fontSize: '11px' } }, allowDecimals: false, min: 0 },
        legend: { enabled: showLegend, itemStyle: { fontSize: '11px' } },
        series,
        credits: { enabled: false },
        tooltip: { shared: true },
    }
}

function makeBarOptions(
    title: string,
    categories: string[],
    data: number[],
    yTitle: string,
    decimalPlaces = 0,
): Highcharts.Options {
    return {
        chart: { type: 'bar', height: 360, animation: false },
        title: { text: title, style: { fontSize: '13px', fontWeight: '600' } },
        xAxis: { categories, labels: { style: { fontSize: '10px' } } },
        yAxis: {
            title: { text: yTitle, style: { fontSize: '11px' } },
            allowDecimals: decimalPlaces > 0,
            min: 0,
        },
        legend: { enabled: false },
        series: [{ type: 'bar', data }],
        credits: { enabled: false },
        tooltip: { valueDecimals: decimalPlaces },
    }
}

function makePieOptions(
    title: string,
    categories: string[],
    data: number[],
    decimalPlaces = 0,
): Highcharts.Options {
    return {
        chart: { type: 'pie', height: 360, animation: false },
        title: { text: title, style: { fontSize: '13px', fontWeight: '600' } },
        series: [{
            type: 'pie',
            data: categories.map((name, i) => ({ name, y: data[i] })),
        }],
        credits: { enabled: false },
        tooltip: { pointFormat: '<b>{point.y}</b> ({point.percentage:.1f}%)', valueDecimals: decimalPlaces },
        plotOptions: { pie: { dataLabels: { enabled: true, format: '{point.name}', style: { fontSize: '10px' } } } },
    }
}

/** Bar chart with bar/pie toggle and optional small-bucket suppression. */
function ToggleChart(props: {
    title: string
    categories: string[]
    data: number[]
    yTitle: string
    decimalPlaces?: number
    /** When true, apply small-bucket suppression in shareable mode. */
    suppressable?: boolean
    shareMode: boolean
    minCellSize: number
}) {
    const { title, yTitle, decimalPlaces = 0, suppressable = false, shareMode, minCellSize } = props
    const [chartMode, setChartMode] = React.useState<'bar' | 'pie'>('bar')

    const { categories, data } = (suppressable && shareMode)
        ? suppressSmallBuckets(props.categories, props.data, minCellSize)
        : { categories: props.categories, data: props.data }

    const options = chartMode === 'bar'
        ? makeBarOptions(title, categories, data, yTitle, decimalPlaces)
        : makePieOptions(title, categories, data, decimalPlaces)

    return (
        <Box sx={{ position: 'relative', boxShadow: 3, borderRadius: 1, overflow: 'hidden' }}>
            <Tooltip title={chartMode === 'bar' ? 'Switch to pie chart' : 'Switch to bar chart'}>
                <IconButton
                    size="small"
                    onClick={() => setChartMode(m => m === 'bar' ? 'pie' : 'bar')}
                    sx={{ position: 'absolute', top: 4, left: 4, zIndex: 1, opacity: 0.5, '&:hover': { opacity: 1 } }}
                >
                    {chartMode === 'bar' ? <PieChart fontSize="small" /> : <BarChart fontSize="small" />}
                </IconButton>
            </Tooltip>
            <HighchartsReact highcharts={Highcharts} options={options} />
        </Box>
    )
}

export function ReportPage() {
    const { start: defaultStart, end: defaultEnd } = defaultRange()
    const [start, setStart] = React.useState(defaultStart)
    const [end, setEnd] = React.useState(defaultEnd)
    const [reportMode, setReportMode] = React.useState<'full' | 'shareable'>('full')
    const [minCellSize, setMinCellSize] = React.useState(5)
    const org = useOrganization()
    const orgId = org.id

    const { data } = useQuery<ReportData>({
        queryKey: ['reports', orgId, start, end],
        queryFn: async () => {
            const res = await fetch(`${host}/api/v1/reports/${orgId}?start=${start}&end=${end}`)
            if (!res.ok) throw new Error('Report fetch failed')
            return res.json()
        },
        enabled: !!orgId,
    })

    const shareMode = reportMode === 'shareable'
    const entryMonths = data?.entriesByMonth.map(r => r.month) ?? []
    const caseMonths = data?.casesByMonth.map(r => r.month) ?? []
    const personMonths = data?.personsByMonth.map(r => r.month) ?? []

    return (
        <Box sx={{ p: 1 }}>
            <Typography variant="h5" sx={{ mb: 2 }}>Reports</Typography>

            <Stack direction="row" spacing={2} sx={{ mb: 2 }} alignItems="center" flexWrap="wrap">
                <TextField
                    type="date"
                    label="From"
                    value={start}
                    onChange={e => setStart(e.target.value)}
                    size="small"
                    slotProps={{ inputLabel: { shrink: true } }}
                />
                <TextField
                    type="date"
                    label="To"
                    value={end}
                    onChange={e => setEnd(e.target.value)}
                    size="small"
                    slotProps={{ inputLabel: { shrink: true } }}
                />
                <ToggleButtonGroup
                    value={reportMode}
                    exclusive
                    onChange={(_, v) => { if (v) setReportMode(v) }}
                    size="small"
                >
                    <ToggleButton value="full">
                        <Lock fontSize="small" sx={{ mr: 0.5 }} /> Full
                    </ToggleButton>
                    <ToggleButton value="shareable">
                        <Share fontSize="small" sx={{ mr: 0.5 }} /> Shareable
                    </ToggleButton>
                </ToggleButtonGroup>
                {shareMode && (
                    <TextField
                        label="Min. cell size"
                        type="number"
                        value={minCellSize}
                        onChange={e => setMinCellSize(Math.max(1, Number(e.target.value)))}
                        size="small"
                        sx={{ width: 140 }}
                        slotProps={{
                            htmlInput: { min: 1, step: 1 },
                            inputLabel: { shrink: true },
                            input: { startAdornment: <InputAdornment position="start">&ge;</InputAdornment> },
                        }}
                    />
                )}
            </Stack>

            {/* Mode banner */}
            <Box
                sx={{
                    mb: 2,
                    px: 2,
                    py: 1,
                    borderRadius: 1,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 1,
                    bgcolor: shareMode ? 'success.light' : 'warning.light',
                    color: shareMode ? 'success.contrastText' : 'warning.contrastText',
                }}
            >
                {shareMode
                    ? <><Share fontSize="small" /> Shareable view &mdash; buckets with fewer than {minCellSize} {minCellSize === 1 ? 'entry' : 'entries'} are merged into &ldquo;Other&rdquo;</>
                    : <><Lock fontSize="small" /> Ombuds eyes only &mdash; all data shown without suppression</>
                }
            </Box>

            <Grid2 container spacing={2}>
                {/* Time-series column charts */}
                <Grid2 size={{ xs: 12, md: 6 }}>
                    <Box sx={{ boxShadow: 3, borderRadius: 1, overflow: 'hidden' }}>
                        <HighchartsReact
                            highcharts={Highcharts}
                            options={colOptions(
                                'Entries per Month',
                                entryMonths,
                                [{ type: 'column', name: 'Entries', data: data?.entriesByMonth.map(r => r.count) ?? [] }],
                                'Entries',
                            )}
                        />
                    </Box>
                </Grid2>

                <Grid2 size={{ xs: 12, md: 6 }}>
                    <Box sx={{ boxShadow: 3, borderRadius: 1, overflow: 'hidden' }}>
                        <HighchartsReact
                            highcharts={Highcharts}
                            options={colOptions(
                                'Contact Time per Month',
                                entryMonths,
                                [{
                                    type: 'column',
                                    name: 'Hours',
                                    data: data?.durationByMonth.map(r => +(r.totalMinutes / 60).toFixed(1)) ?? [],
                                }],
                                'Hours',
                            )}
                        />
                    </Box>
                </Grid2>

                <Grid2 size={{ xs: 12, md: 6 }}>
                    <Box sx={{ boxShadow: 3, borderRadius: 1, overflow: 'hidden' }}>
                        <HighchartsReact
                            highcharts={Highcharts}
                            options={colOptions(
                                'Cases Opened per Month',
                                caseMonths,
                                [{ type: 'column', name: 'Cases', data: data?.casesByMonth.map(r => r.count) ?? [] }],
                                'Cases',
                            )}
                        />
                    </Box>
                </Grid2>

                <Grid2 size={{ xs: 12, md: 6 }}>
                    <Box sx={{ boxShadow: 3, borderRadius: 1, overflow: 'hidden' }}>
                        <HighchartsReact
                            highcharts={Highcharts}
                            options={colOptions(
                                'Persons per Month',
                                personMonths,
                                [
                                    {
                                        type: 'column',
                                        name: 'Total appearances',
                                        data: data?.personsByMonth.map(r => r.totalAppearances) ?? [],
                                    },
                                    {
                                        type: 'column',
                                        name: 'Unique persons',
                                        data: data?.personsByMonth.map(r => r.uniquePersons) ?? [],
                                    },
                                ],
                                'Persons',
                                true,
                            )}
                        />
                    </Box>
                </Grid2>

                {/* Categorical charts — bar/pie toggle + shareable suppression */}
                <Grid2 size={{ xs: 12, md: 6 }}>
                    <ToggleChart
                        title="Unique Persons by Race / Ethnicity"
                        categories={data?.personsByRace.map(r => r.race) ?? []}
                        data={data?.personsByRace.map(r => r.count) ?? []}
                        yTitle="Persons"
                        suppressable
                        shareMode={shareMode}
                        minCellSize={minCellSize}
                    />
                </Grid2>

                <Grid2 size={{ xs: 12, md: 6 }}>
                    <ToggleChart
                        title="Entries by Contact Method"
                        categories={data?.entriesByMedium.map(r => r.medium) ?? []}
                        data={data?.entriesByMedium.map(r => r.count) ?? []}
                        yTitle="Entries"
                        suppressable
                        shareMode={shareMode}
                        minCellSize={minCellSize}
                    />
                </Grid2>

                <Grid2 size={{ xs: 12, md: 6 }}>
                    {/* Avg duration is not a count — suppression doesn't apply */}
                    <ToggleChart
                        title="Avg. Contact Time by Method (min)"
                        categories={data?.avgDurationByMedium.map(r => r.medium) ?? []}
                        data={data?.avgDurationByMedium.map(r => r.avgMinutes) ?? []}
                        yTitle="Minutes"
                        decimalPlaces={1}
                        shareMode={shareMode}
                        minCellSize={minCellSize}
                    />
                </Grid2>

                <Grid2 size={{ xs: 12, md: 6 }}>
                    <ToggleChart
                        title="Unique Persons by Role"
                        categories={data?.personsByRole.map(r => r.role) ?? []}
                        data={data?.personsByRole.map(r => r.count) ?? []}
                        yTitle="Persons"
                        suppressable
                        shareMode={shareMode}
                        minCellSize={minCellSize}
                    />
                </Grid2>

                <Grid2 size={{ xs: 12, md: 6 }}>
                    <ToggleChart
                        title="Unique Persons by Generation"
                        categories={data?.personsByGeneration.map(r => r.generation) ?? []}
                        data={data?.personsByGeneration.map(r => r.count) ?? []}
                        yTitle="Persons"
                        suppressable
                        shareMode={shareMode}
                        minCellSize={minCellSize}
                    />
                </Grid2>

                <Grid2 size={{ xs: 12, md: 6 }}>
                    <ToggleChart
                        title="Cases by Current Status"
                        categories={data?.casesByStatus.map(r => r.status) ?? []}
                        data={data?.casesByStatus.map(r => r.count) ?? []}
                        yTitle="Cases"
                        suppressable
                        shareMode={shareMode}
                        minCellSize={minCellSize}
                    />
                </Grid2>

                <Grid2 size={{ xs: 12, md: 6 }}>
                    <ToggleChart
                        title="Most Common Codes (by Cases)"
                        categories={data?.codesByCaseCount.map(resolveCodeLabel) ?? []}
                        data={data?.codesByCaseCount.map(r => r.count ?? 0) ?? []}
                        yTitle="Cases"
                        suppressable
                        shareMode={shareMode}
                        minCellSize={minCellSize}
                    />
                </Grid2>

                <Grid2 size={{ xs: 12, md: 6 }}>
                    <ToggleChart
                        title="Contact Time by Code (hours)"
                        categories={data?.codesByDuration.map(resolveCodeLabel) ?? []}
                        data={data?.codesByDuration.map(r => +((r.totalMinutes ?? 0) / 60).toFixed(1)) ?? []}
                        yTitle="Hours"
                        decimalPlaces={1}
                        shareMode={shareMode}
                        minCellSize={minCellSize}
                    />
                </Grid2>

                <Grid2 size={{ xs: 12, md: 6 }}>
                    <ToggleChart
                        title="Most Active Codes (by Entries)"
                        categories={data?.codesByEntryCount.map(resolveCodeLabel) ?? []}
                        data={data?.codesByEntryCount.map(r => r.count ?? 0) ?? []}
                        yTitle="Entries"
                        suppressable
                        shareMode={shareMode}
                        minCellSize={minCellSize}
                    />
                </Grid2>
            </Grid2>
        </Box>
    )
}
