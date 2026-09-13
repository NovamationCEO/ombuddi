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
}))

const caseItem = (id: string, name: string, status: string, caseKind: CaseType['caseKind'] = 'standard') => ({
    id,
    organizationId: 'org-1',
    caseKind,
    ownerOmbudsId: caseKind === 'general' ? 'ombuds-1' : null,
    name,
    description: '',
    codes: [],
    status,
    createdAt: new Date('2026-01-01'),
    updatedAt: new Date('2026-01-02'),
})

vi.mock('react-router-dom', () => ({
    useNavigate: () => mocks.navigate,
}))

vi.mock('../tools/db_tools/useGetter', () => ({
    useGetter: (key: string[]) => {
        const dataByKey: Record<string, unknown> = {
            'get_cases_by_status/active': [caseItem('active-1', 'Active case', 'active')],
            get_general_activity_case: caseItem('general-1', 'General activity', 'active', 'general'),
            'get_cases_by_status/monitoring': [caseItem('monitoring-1', 'Monitoring case', 'monitoring')],
            'get_cases_by_status/closed': [caseItem('closed-1', 'Closed case', 'closed')],
        }
        return { data: dataByKey[key.join('/')], isLoading: false, isError: false }
    },
}))

vi.mock('../tools/db_tools/creator', () => ({ creator: mocks.creator }))
vi.mock('../libraries/useSnack', () => ({
    useSnack: (selector: (state: { setSnack: typeof mocks.setSnack }) => unknown) =>
        selector({ setSnack: mocks.setSnack }),
}))
vi.mock('../components/LoadAllCases/CaseCard', () => ({
    CaseCard: ({ caseItem: item }: { caseItem: CaseType }) => <div data-case-card={item.id}>{item.name}</div>,
}))

describe('Cases', () => {
    let container: HTMLDivElement
    let root: Root

    beforeEach(() => {
        container = document.createElement('div')
        document.body.append(container)
        root = createRoot(container)
        mocks.creator.mockReset().mockResolvedValue({ id: 'general-1' })
        mocks.navigate.mockReset()
        mocks.setSnack.mockReset()
    })

    afterEach(async () => {
        await act(async () => root.unmount())
        container.remove()
    })

    it('places General activity between active and monitoring cases', async () => {
        await act(async () => root.render(<Cases />))

        const ids = [...container.querySelectorAll('[data-case-card]')].map((item) =>
            item.getAttribute('data-case-card'),
        )
        expect(ids).toEqual(['active-1', 'general-1', 'monitoring-1', 'closed-1'])
    })

    it('creates or reuses the container before opening a new entry', async () => {
        await act(async () => root.render(<Cases />))
        const logButton = [...container.querySelectorAll('button')].find((button) =>
            button.textContent?.includes('Log general activity'),
        )

        await act(async () => {
            logButton?.click()
            await Promise.resolve()
        })

        expect(mocks.creator).toHaveBeenCalledWith('general_activity_case', {})
        expect(mocks.navigate).toHaveBeenCalledWith('/case/general-1/add_entry')
    })
})
