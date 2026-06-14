import { Box, Stack, TextField, Typography } from '@mui/material'
import Grid2 from '@mui/material/Grid'
import React from 'react'
import Highcharts from 'highcharts'
import HighchartsReactOfficial from 'highcharts-react-official'
// highcharts-react-official ships CJS; Vite wraps it in an object at runtime
const HighchartsReact = (HighchartsReactOfficial as any).default ?? HighchartsReactOfficial
import { useQuery } from '@tanstack/react-query'
import { useOrganization } from '../tools/useOrganization'

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
        chart: { type: 'column', height: 240, animation: false },
        title: { text: title, style: { fontSize: '13px', fontWeight: '600' } },
        xAxis: { categories, labels: { rotation: -45, style: { fontSize: '10px' } } },
        yAxis: { title: { text: yTitle, style: { fontSize: '11px' } }, allowDecimals: false, min: 0 },
        legend: { enabled: showLegend, itemStyle: { fontSize: '11px' } },
        series,
        credits: { enabled: false },
        tooltip: { shared: true },
    }
}

function barOptions(
    title: string,
    categories: string[],
    data: number[],
    yTitle: string,
    decimalPlaces = 0,
): Highcharts.Options {
    return {
        chart: { type: 'bar', height: 240, animation: false },
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
                <Grid2 size={{ xs: 12, md: 6 }}>
                    <HighchartsReact
                        highcharts={Highcharts}
                        options={colOptions(
                            'Entries per Month',
                            entryMonths,
                            [{ type: 'column', name: 'Entries', data: data?.entriesByMonth.map(r => r.count) ?? [] }],
                            'Entries',
                        )}
                    />
                </Grid2>

                <Grid2 size={{ xs: 12, md: 6 }}>
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
                </Grid2>

                <Grid2 size={{ xs: 12, md: 6 }}>
                    <HighchartsReact
                        highcharts={Highcharts}
                        options={colOptions(
                            'Cases Opened per Month',
                            caseMonths,
                            [{ type: 'column', name: 'Cases', data: data?.casesByMonth.map(r => r.count) ?? [] }],
                            'Cases',
                        )}
                    />
                </Grid2>

                <Grid2 size={{ xs: 12, md: 6 }}>
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
                </Grid2>

                <Grid2 size={{ xs: 12, md: 6 }}>
                    <HighchartsReact
                        highcharts={Highcharts}
                        options={barOptions(
                            'Unique Persons by Race / Ethnicity',
                            data?.personsByRace.map(r => r.race) ?? [],
                            data?.personsByRace.map(r => r.count) ?? [],
                            'Persons',
                        )}
                    />
                </Grid2>

                <Grid2 size={{ xs: 12, md: 6 }}>
                    <HighchartsReact
                        highcharts={Highcharts}
                        options={barOptions(
                            'Entries by Contact Method',
                            data?.entriesByMedium.map(r => r.medium) ?? [],
                            data?.entriesByMedium.map(r => r.count) ?? [],
                            'Entries',
                        )}
                    />
                </Grid2>

                <Grid2 size={{ xs: 12, md: 6 }}>
                    <HighchartsReact
                        highcharts={Highcharts}
                        options={barOptions(
                            'Avg. Contact Time by Method (min)',
                            data?.avgDurationByMedium.map(r => r.medium) ?? [],
                            data?.avgDurationByMedium.map(r => r.avgMinutes) ?? [],
                            'Minutes',
                            1,
                        )}
                    />
                </Grid2>

                <Grid2 size={{ xs: 12, md: 6 }}>
                    <HighchartsReact
                        highcharts={Highcharts}
                        options={barOptions(
                            'Unique Persons by Role',
                            data?.personsByRole.map(r => r.role) ?? [],
                            data?.personsByRole.map(r => r.count) ?? [],
                            'Persons',
                        )}
                    />
                </Grid2>

                <Grid2 size={{ xs: 12, md: 6 }}>
                    <HighchartsReact
                        highcharts={Highcharts}
                        options={barOptions(
                            'Unique Persons by Generation',
                            data?.personsByGeneration.map(r => r.generation) ?? [],
                            data?.personsByGeneration.map(r => r.count) ?? [],
                            'Persons',
                        )}
                    />
                </Grid2>

                <Grid2 size={{ xs: 12, md: 6 }}>
                    <HighchartsReact
                        highcharts={Highcharts}
                        options={barOptions(
                            'Cases by Current Status',
                            data?.casesByStatus.map(r => r.status) ?? [],
                            data?.casesByStatus.map(r => r.count) ?? [],
                            'Cases',
                        )}
                    />
                </Grid2>
            </Grid2>
        </Box>
    )
}
