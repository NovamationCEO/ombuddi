// @vitest-environment jsdom

import React, { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { ThemeProvider } from '@mui/material/styles'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { appTheme } from '../../theme/appTheme'
import { PicklistManager } from './PicklistManager'

;(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true

const mocks = vi.hoisted(() => ({
    creator: vi.fn(),
    refetch: vi.fn(),
    setSnack: vi.fn(),
    universalOnly: false,
    items: [
        {
            id: 'source-1', organizationId: 'org-1', kind: 'referral_source', name: 'Supervisor',
            description: '', behavior: 'standard', index: 3, softDelete: false,
        },
        {
            id: 'source-other', organizationId: 'org-1', kind: 'referral_source', name: 'Other (please specify)',
            description: '', behavior: 'other_detail', index: 10000, softDelete: false,
        },
        {
            id: 'source-unknown', organizationId: 'org-1', kind: 'referral_source', name: 'Unknown',
            description: '', behavior: 'exclusive', index: 10001, softDelete: false,
        },
    ],
}))

vi.mock('../../tools/useOrganization', () => ({
    useOrganization: () => ({ id: 'org-1', name: 'Example Organization' }),
}))

vi.mock('../../tools/usePicklists', () => ({
    usePicklists: () => ({
        items: mocks.universalOnly
            ? mocks.items.filter((item) => item.behavior !== 'standard')
            : mocks.items,
        allItems: mocks.items,
        isLoading: false,
        refetch: mocks.refetch,
    }),
}))

vi.mock('../../tools/db_tools/creator', () => ({ creator: mocks.creator }))
vi.mock('../../tools/db_tools/updater', () => ({ updater: vi.fn() }))
vi.mock('../../libraries/useSnack', () => ({
    useSnack: (selector: (state: { setSnack: typeof mocks.setSnack }) => unknown) =>
        selector({ setSnack: mocks.setSnack }),
}))

describe('PicklistManager universal referral options', () => {
    let container: HTMLDivElement
    let root: Root

    beforeEach(() => {
        container = document.createElement('div')
        document.body.appendChild(container)
        root = createRoot(container)
        mocks.creator.mockReset().mockResolvedValue({ success: true })
        mocks.refetch.mockReset()
        mocks.setSnack.mockReset()
        mocks.universalOnly = false
    })

    afterEach(async () => {
        await act(async () => root.unmount())
        container.remove()
    })

    it('shows only organization-owned sources and ignores universal positions when adding', async () => {
        await act(async () => {
            root.render(
                <ThemeProvider theme={appTheme} defaultMode="dark">
                    <PicklistManager
                        kind="referral_source"
                        title="Referral Sources"
                        singularNoun="referral source"
                        hiddenBehaviors={['other_detail', 'exclusive']}
                    />
                </ThemeProvider>,
            )
        })

        expect(container.textContent).toContain('Supervisor')
        expect(container.textContent).not.toContain('Other (please specify)')
        expect(container.textContent).not.toContain('Unknown')

        const addButton = Array.from(container.querySelectorAll('button')).find((button) =>
            button.textContent?.includes('Add referral source'),
        )
        await act(async () => addButton?.click())

        expect(mocks.creator).toHaveBeenCalledWith('add_picklist', {
            organizationId: 'org-1',
            kind: 'referral_source',
            name: 'New referral source',
            description: '',
            index: 4,
            softDelete: false,
        })
    })

    it('reports a real default-loading failure instead of calling it a duplicate', async () => {
        mocks.universalOnly = true
        mocks.creator
            .mockResolvedValueOnce({ success: true })
            .mockRejectedValueOnce(new Error('Database unavailable'))

        await act(async () => {
            root.render(
                <ThemeProvider theme={appTheme} defaultMode="dark">
                    <PicklistManager
                        kind="referral_source"
                        title="Referral Sources"
                        singularNoun="referral source"
                        hiddenBehaviors={['other_detail', 'exclusive']}
                        defaultSets={[{
                            label: 'Standard',
                            items: [
                                { name: 'Supervisor', description: '' },
                                { name: 'HR', description: '' },
                            ],
                        }]}
                    />
                </ThemeProvider>,
            )
        })

        const loadDefaults = Array.from(container.querySelectorAll('button')).find((button) =>
            button.textContent?.includes('Load defaults'),
        )
        await act(async () => loadDefaults?.click())

        const load = Array.from(document.body.querySelectorAll('button')).find((button) =>
            button.textContent === 'Load',
        )
        await act(async () => load?.click())

        expect(mocks.setSnack).toHaveBeenCalledWith({
            message: 'Loaded 1 option before the error. Database unavailable',
            severity: 'error',
        })
        expect(mocks.refetch).toHaveBeenCalledOnce()
    })
})
