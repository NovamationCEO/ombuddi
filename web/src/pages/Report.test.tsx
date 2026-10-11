// @vitest-environment jsdom
import React, { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { ThemeProvider } from '@mui/material/styles'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { appTheme } from '../theme/appTheme'
import { ReportPage } from './Report'

;(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true
const mocks = vi.hoisted(() => ({ data: {} as Record<string, unknown> }))
vi.mock('@tanstack/react-query', () => ({ useQuery: () => ({ data: mocks.data }) }))
vi.mock('../tools/useOrganization', () => ({ useOrganization: () => ({ id: 'org', name: 'Example' }) }))
vi.mock('highcharts', () => ({ default: { setOptions: vi.fn() } }))
vi.mock('highcharts/modules/exporting', () => ({}))
vi.mock('highcharts/modules/offline-exporting', () => ({}))
vi.mock('highcharts/modules/export-data', () => ({}))
vi.mock('highcharts-react-official', () => ({
    default: ({ options }: { options: { title: { text: string } } }) => (
        <div data-chart={options.title.text}>{JSON.stringify(options)}</div>
    ),
}))

let root: Root, container: HTMLDivElement
beforeEach(() => {
    mocks.data = {
        entriesByMonth: [], durationByMonth: [], casesByMonth: [], personsByMonth: [],
        personsByRace: [], entriesByMedium: [], avgDurationByMedium: [], personsByRole: [],
        personsByGeneration: [], casesByStatus: [], codesByCaseCount: [], codesByDuration: [], codesByEntryCount: [],
        casesByTheme: [{ theme: 'Advising', count: 8 }, { theme: 'Retired theme', count: 2 }],
        themesByDuration: [{ theme: 'Advising', totalMinutes: 135 }, { theme: 'Retired theme', totalMinutes: 30 }],
        themesByEntryCount: [{ theme: 'Advising', count: 12 }, { theme: 'Retired theme', count: 3 }],
    }
    container = document.createElement('div')
    document.body.append(container)
    root = createRoot(container)
})
afterEach(async () => {
    await act(async () => root.unmount())
    container.remove()
})
async function render() {
    await act(async () => root.render(<ThemeProvider theme={appTheme}><ReportPage /></ThemeProvider>))
}
function chart(title: string) {
    return JSON.parse(container.querySelector(`[data-chart="${title}"]`)!.textContent!)
}
const casesTitle = 'Most Common Themes (by Cases Worked)'
const durationTitle = 'Contact Time by Theme (hours)'
const entriesTitle = 'Most Active Themes (by Entries)'

describe('theme reports', () => {
    it('pairs themes with code reports and converts contact minutes to hours', async () => {
        await render()
        const titles = [...container.querySelectorAll('[data-chart]')].map((node) => node.getAttribute('data-chart'))
        expect(titles.slice(-6)).toEqual([
            'Most Common Codes (by Cases Worked)', casesTitle, 'Contact Time by Code (hours)',
            durationTitle, 'Most Active Codes (by Entries)', entriesTitle,
        ])
        expect(chart(casesTitle).xAxis.categories).toEqual(['Advising', 'Retired theme'])
        expect(chart(casesTitle).series[0].data).toEqual([8, 2])
        expect(chart(durationTitle).series[0].data).toEqual([2.3, 0.5])
        expect(chart(entriesTitle).series[0].data).toEqual([12, 3])
        const panel = container.querySelector(`[data-chart="${durationTitle}"]`)!.parentElement!
        await act(async () => panel.querySelector('button')!.click())
        expect(chart(durationTitle).chart.type).toBe('pie')
        expect(chart(durationTitle).series[0].data).toEqual([{ name: 'Advising', y: 2.3 }, { name: 'Retired theme', y: 0.5 }])
    })
    it('suppresses small theme counts in shareable mode using the same rules as codes', async () => {
        await render()
        await act(async () => [...container.querySelectorAll('button')].find((button) => button.textContent?.includes('Shareable'))!.click())
        for (const title of [casesTitle, entriesTitle]) {
            expect(chart(title).xAxis.categories).toEqual(['Advising', 'Other'])
        }
        expect(chart(casesTitle).series[0].data).toEqual([8, 2])
        expect(chart(entriesTitle).series[0].data).toEqual([12, 3])
        expect(chart(durationTitle).xAxis.categories).toEqual(['Advising', 'Retired theme'])
    })
    it('renders empty theme charts when the response has no theme metrics', async () => {
        delete mocks.data.casesByTheme
        delete mocks.data.themesByDuration
        delete mocks.data.themesByEntryCount
        await render()
        for (const title of [casesTitle, durationTitle, entriesTitle]) {
            expect(chart(title).series[0].data).toEqual([])
        }
    })
})
