import { Box, IconButton, Stack, TextField, Tooltip, Typography } from '@mui/material'
import Grid2 from '@mui/material/Grid'
import React from 'react'
import Highcharts from 'highcharts'
import HighchartsReactOfficial from 'highcharts-react-official'
// highcharts-react-official ships CJS; Vite wraps it in an object at runtime
const HighchartsReact = (HighchartsReactOfficial as any).default ?? HighchartsReactOfficial
import { useQuery } from '@tanstack/react-query'
import { useOrganization } from '../tools/useOrganization'
import { BarChart, PieChart } from '@mui/icons-material'

const host = window.location.host.includes('localhost')
    ? 'http://localhost:5002'
    : `https://${window.location.host}`

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

/** Bar chart with a small toggle to switch to pie view. */
function ToggleChart(props: {
    title: string
    categories: string[]
    data: number[]
    yTitle: string
    decimalPlaces?: number
}) {
    const { title, categories, data, yTitle, decimalPlaces = 0 } = props
    const [mode, setMode] = React.useState<'bar' | 'pie'>('bar')

    const options = mode === 'bar'
        ? makeBarOptions(title, categories, data, yTitle, decimalPlaces)
        : makePieOptions(title, categories, data, decimalPlaces)

    return (
        <Box sx={{ position: 'relative', boxShadow: 3, borderRadius: 1, overflow: 'hidden' }}>
            <Tooltip title={mode === 'bar' ? 'Switch to pie chart' : 'Switch to bar chart'}>
                <IconButton
                    size="small"
                    onClick={() => setMode(m => m === 'bar' ? 'pie' : 'bar')}
                    sx={{ position: 'absolute', top: 4, right: 4, zIndex: 1, opacity: 0.5, '&:hover': { opacity: 1 } }}
                >
                    {mode === 'bar' ? <PieChart fontSize="small" /> : <BarChart fontSize="small" />}
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

    const entryMonths = data?.entriesByMonth.map(r => r.month) ?? []
    const caseMonths = data?.casesByMonth.map(r => r.month) ?? []
    const personMonths = data?.personsByMonth.map(r => r.month) ?? []

    return (
        <Box sx={{ p: 1 }}>
            <Typography variant="h5" sx={{ mb: 2 }}>Reports</Typography>

            <Stack direction="row" spacing={2} sx={{ mb: 3 }} alignItems="center">
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
            </Stack>

            <Grid2 container spacing={2}>
                {/* Time-series column charts — no toggle */}
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

                {/* Categorical charts — bar/pie toggle */}
                <Grid2 size={{ xs: 12, md: 6 }}>
                    <ToggleChart
                        title="Unique Persons by Race / Ethnicity"
                        categories={data?.personsByRace.map(r => r.race) ?? []}
                        data={data?.personsByRace.map(r => r.count) ?? []}
                        yTitle="Persons"
                    />
                </Grid2>

                <Grid2 size={{ xs: 12, md: 6 }}>
                    <ToggleChart
                        title="Entries by Contact Method"
                        categories={data?.entriesByMedium.map(r => r.medium) ?? []}
                        data={data?.entriesByMedium.map(r => r.count) ?? []}
                        yTitle="Entries"
                    />
                </Grid2>

                <Grid2 size={{ xs: 12, md: 6 }}>
                    <ToggleChart
                        title="Avg. Contact Time by Method (min)"
                        categories={data?.avgDurationByMedium.map(r => r.medium) ?? []}
                        data={data?.avgDurationByMedium.map(r => r.avgMinutes) ?? []}
                        yTitle="Minutes"
                        decimalPlaces={1}
                    />
                </Grid2>

                <Grid2 size={{ xs: 12, md: 6 }}>
                    <ToggleChart
                        title="Unique Persons by Role"
                        categories={data?.personsByRole.map(r => r.role) ?? []}
                        data={data?.personsByRole.map(r => r.count) ?? []}
                        yTitle="Persons"
                    />
                </Grid2>

                <Grid2 size={{ xs: 12, md: 6 }}>
                    <ToggleChart
                        title="Unique Persons by Generation"
                        categories={data?.personsByGeneration.map(r => r.generation) ?? []}
                        data={data?.personsByGeneration.map(r => r.count) ?? []}
                        yTitle="Persons"
                    />
                </Grid2>

                <Grid2 size={{ xs: 12, md: 6 }}>
                    <ToggleChart
                        title="Cases by Current Status"
                        categories={data?.casesByStatus.map(r => r.status) ?? []}
                        data={data?.casesByStatus.map(r => r.count) ?? []}
                        yTitle="Cases"
                    />
                </Grid2>
            </Grid2>
        </Box>
    )
}
