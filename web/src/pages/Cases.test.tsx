// @vitest-environment jsdom
import React, { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { CaseType } from '../types/majorTypes'
import { Cases } from './Cases'
;(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true

const mocks = vi.hoisted(() => ({
    creator: vi.fn(),
    navigate: vi.fn(),
    setSnack: vi.fn(),
    refetch: vi.fn(),
    desktop: true,
    general: true,
    error: false,
    peopleLoading: false,
    peopleError: false,
}))
const caseItem = (id: string, name: string, status: string, caseKind: CaseType['caseKind'] = 'standard') => ({
    id,
    organizationId: 'org-1',
    caseKind,
    name,
    description: `${name} summary`,
    codes: ['code-1', 'code-2', 'code-3'],
    themes: ['Advising Issues', 'Equity Issues', 'Workload'],
    status,
    createdAt: new Date('2026-01-01'),
    updatedAt: new Date('2026-01-02'),
})
vi.mock('@mui/material', async (importOriginal) => ({
    ...(await importOriginal<typeof import('@mui/material')>()),
    useMediaQuery: () => mocks.desktop,
}))
vi.mock('react-router-dom', () => ({ useNavigate: () => mocks.navigate }))
vi.mock('../tools/db_tools/useGetter', () => ({
    useGetter: (key: string[]) => {
        if (key[0] === 'get_persons_by_case_id') {
            const person = { id: 'person-1', monsterSeed: 'seed-1', monsterVersion: 1 }
            return {
                data:
                    key[1] === 'active-1' ? [person, person, { ...person, id: 'person-2', monsterSeed: 'seed-2' }] : [],
                isLoading: mocks.peopleLoading,
                isError: mocks.peopleError,
                refetch: mocks.refetch,
            }
        }
        const dataByKey: Record<string, unknown> = {
            'get_cases_by_status/active': [
                caseItem('active-1', 'Active case', 'active'),
                {
                    ...caseItem('active-2', 'Another case', 'active'),
                    themes: ['Job Insecurity'],
                    codes: [],
                    updatedAt: new Date('2026-01-01'),
                },
            ],
            get_general_activity_case: mocks.general
                ? caseItem('general-1', 'General activity', 'active', 'general')
                : null,
            'get_cases_by_status/monitoring': [caseItem('monitoring-1', 'Monitoring case', 'monitoring')],
            'get_cases_by_status/closed': [caseItem('closed-1', 'Closed case', 'closed')],
        }
        return { data: dataByKey[key.join('/')], isLoading: false, isError: mocks.error, refetch: mocks.refetch }
    },
}))
vi.mock('../tools/useResolvedCaseCodes', () => ({
    useResolvedCaseCodes: (ids: string[]) =>
        ids.map((id, i) => ({ id, shortName: `2.${i + 1}`, description: `Code explanation ${i + 1}` })),
}))
vi.mock('../tools/db_tools/creator', () => ({ creator: mocks.creator }))
vi.mock('../libraries/useSnack', () => ({
    useSnack: (select: (state: { setSnack: typeof mocks.setSnack }) => unknown) => select({ setSnack: mocks.setSnack }),
}))
vi.mock('../components/CaseSceneThumbnail', () => ({ CaseSceneThumbnail: () => <span /> }))
vi.mock('../components/PersonAvatar', () => ({
    PersonAvatar: ({ person }: { person: { monsterSeed: string } }) => <span data-avatar-seed={person.monsterSeed} />,
}))

let container: HTMLDivElement, root: Root
beforeEach(() => {
    vi.clearAllMocks()
    mocks.desktop = true
    mocks.general = true
    mocks.error = false
    mocks.peopleLoading = false
    mocks.peopleError = false
    mocks.creator.mockResolvedValue({ id: 'general-1' })
    container = document.createElement('div')
    document.body.append(container)
    root = createRoot(container)
})
afterEach(async () => {
    await act(async () => root.unmount())
    container.remove()
})
async function render() {
    await act(async () => root.render(<Cases />))
}
async function click(label: string) {
    const button = [...document.body.querySelectorAll('button')].find(
        (node) => node.getAttribute('aria-label') === label || node.textContent?.trim() === label,
    )!
    expect(button).toBeTruthy()
    await act(async () => button.click())
}
async function search(text: string) {
    const input = container.querySelector('input')!
    await act(async () => {
        Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!.call(input, text)
        input.dispatchEvent(new Event('input', { bubbles: true }))
    })
}
const ids = () => [...container.querySelectorAll('[data-case-card]')].map((node) => node.getAttribute('data-case-card'))

describe('Cases folder workspace', () => {
    it('defaults to active folders with a separate General activity memo and full inspection', async () => {
        await render()
        expect(ids()).toEqual(['active-1', 'active-2'])
        const inspection = container.querySelector('[aria-label="Quick look: Active case"]')!
        expect(inspection.textContent).toContain('Code explanation 3')
        expect(inspection.textContent).toContain('Workload')
        expect(container.querySelector('.case-general-memo')).not.toBeNull()
        expect(mocks.navigate).not.toHaveBeenCalled()
    })
    it('selects a folder without navigating, then opens that case explicitly', async () => {
        await render()
        await click('Inspect Another case')
        expect(container.querySelector('[aria-label="Quick look: Another case"]')).not.toBeNull()
        expect(mocks.navigate).not.toHaveBeenCalled()
        await click('Open case')
        expect(mocks.navigate).toHaveBeenCalledWith('/case/active-2')
    })
    it('keeps closed and monitoring cases accessible behind their filters', async () => {
        await render()
        await click('Closed cases')
        expect(ids()).toEqual(['closed-1'])
        expect(container.querySelector('[aria-label="Quick look: Closed case"]')).not.toBeNull()
        await click('Monitoring cases')
        expect(ids()).toEqual(['monitoring-1'])
        await click('Open case')
        expect(mocks.navigate).toHaveBeenCalledWith('/case/monitoring-1')
    })
    it('searches case names, themes and readable code labels, and clears stale inspection when empty', async () => {
        await render()
        await click('All cases')
        await search('Active case')
        expect(ids()).toEqual(['active-1'])
        for (const value of ['Equity', '2.3']) {
            await search(value)
            expect(ids()).toEqual(['active-1', 'monitoring-1', 'closed-1'])
        }
        await search('Job Insecurity')
        expect(ids()).toEqual(['active-2'])
        await search('No match')
        expect(ids()).toEqual([])
        expect(container.textContent).toContain('No matching cases')
        expect(container.querySelector('.case-inspection-folder')).toBeNull()
    })
    it('preserves the search across status filters and clears it without changing status', async () => {
        await render()
        await search('Equity')
        expect(ids()).toEqual(['active-1'])
        expect(container.textContent).toContain('Search applied:')
        expect(container.textContent).toContain('1 match in active cases')
        await click('All cases')
        expect(ids()).toEqual(['active-1', 'monitoring-1', 'closed-1'])
        expect(container.querySelector('input')?.value).toBe('Equity')
        expect(container.textContent).toContain('3 matches in all cases')
        await click('Closed cases')
        expect(ids()).toEqual(['closed-1'])
        expect(container.querySelector('input')?.value).toBe('Equity')
        expect(container.querySelector('[aria-label="Closed cases"]')?.getAttribute('aria-pressed')).toBe('true')
        await search('No match')
        expect(ids()).toEqual([])
        expect(container.textContent).toContain('0 matches in closed cases')
        await click('Clear search')
        expect(container.querySelector('input')?.value).toBe('')
        expect(ids()).toEqual(['closed-1'])
        expect(container.textContent).not.toContain('Search applied:')
        expect(container.querySelector('[aria-label="Clear search"]')).toBeNull()
        await click('All cases')
        expect(ids()).toEqual(['active-1', 'monitoring-1', 'closed-1', 'active-2'])
    })
    it('labels and distinguishes each folder status when showing All', async () => {
        await render()
        await click('All cases')
        for (const status of ['active', 'monitoring', 'closed']) {
            const card = container.querySelector(`[data-case-card="${status}-1"]`)!
            expect(card.classList.contains(`case-file--${status}`)).toBe(true)
            expect(card.querySelector('.case-file-status')?.textContent).toBe(status)
            expect(card.getAttribute('aria-description')).toBe(`Status: ${status}`)
        }
    })
    it('shows each associated person once and updates people with the selected case', async () => {
        await render()
        expect(
            [...container.querySelectorAll('[data-avatar-seed]')].map((node) => node.getAttribute('data-avatar-seed')),
        ).toEqual(['seed-1', 'seed-2'])
        expect(container.querySelector('[aria-label="Associated people"]')?.textContent).toContain('People 2')
        await click('Inspect Another case')
        expect(container.querySelector('[data-avatar-seed]')).toBeNull()
        expect(container.textContent).toContain('No people added.')
    })
    it('distinguishes loading people and failed requests from cases with no people', async () => {
        mocks.peopleLoading = true
        await render()
        expect(container.querySelector('[aria-label="Loading case people"]')).not.toBeNull()
        expect(container.textContent).not.toContain('No people added.')
        mocks.peopleLoading = false
        mocks.peopleError = true
        await render()
        expect(container.textContent).toContain('People could not be loaded.')
        expect(container.textContent).not.toContain('No people added.')
        await click('Retry people')
        expect(mocks.refetch).toHaveBeenCalledTimes(1)
    })
    it('opens and dismisses Quick look on small screens', async () => {
        mocks.desktop = false
        await render()
        expect(document.querySelector('.case-inspection-folder')).toBeNull()
        await click('Inspect Active case')
        expect(document.querySelector('[aria-label="Quick look: Active case"]')).not.toBeNull()
        await click('Close quick look')
        // Allow the drawer's exit transition to finish before checking removal.
        await act(async () => {
            await new Promise((resolve) => setTimeout(resolve, 300))
        })
        expect(document.querySelector('.case-inspection-folder')).toBeNull()
    })
    it('handles accounts without General activity and creates the record only when requested', async () => {
        mocks.general = false
        await render()
        expect(container.querySelector('.case-general-memo')).toBeNull()
        expect(container.textContent).not.toContain('could not be loaded')
        await click('Log general activity')
        expect(mocks.creator).toHaveBeenCalledWith('general_activity_case', {})
        expect(mocks.navigate).toHaveBeenCalledWith('/case/general-1/add_entry')
    })
    it('retains real load errors and retries every case collection', async () => {
        mocks.error = true
        await render()
        expect(container.textContent).toContain('Some case records could not be loaded.')
        await click('Retry')
        expect(mocks.refetch).toHaveBeenCalledTimes(4)
    })
})
