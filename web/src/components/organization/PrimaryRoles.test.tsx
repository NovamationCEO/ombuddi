// @vitest-environment jsdom

import React, { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { ThemeProvider } from '@mui/material/styles'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { appTheme } from '../../theme/appTheme'
import { PrimaryRoles } from './PrimaryRoles'

;(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true

const mocks = vi.hoisted(() => ({
    creator: vi.fn(),
    updater: vi.fn(),
    refetch: vi.fn(),
    setSnack: vi.fn(),
    roles: [
        { id: 'role-1', organizationId: 'org-1', name: 'Faculty', index: 0, softDelete: false },
        { id: 'role-2', organizationId: 'org-1', name: 'Staff', index: 1, softDelete: false },
    ],
}))

vi.mock('../../tools/useOrganization', () => ({
    useOrganization: () => ({ id: 'org-1', name: 'Example Organization' }),
}))

vi.mock('../../tools/db_tools/useGetter', () => ({
    useGetter: () => ({
        data: mocks.roles,
        isLoading: false,
        refetch: mocks.refetch,
    }),
}))

vi.mock('../../tools/db_tools/creator', () => ({
    creator: mocks.creator,
}))

vi.mock('../../tools/db_tools/updater', () => ({
    updater: mocks.updater,
}))

vi.mock('../../libraries/useSnack', () => ({
    useSnack: (selector: (state: { setSnack: typeof mocks.setSnack }) => unknown) => selector({ setSnack: mocks.setSnack }),
}))

describe('PrimaryRoles', () => {
    let container: HTMLDivElement
    let root: Root

    beforeEach(() => {
        container = document.createElement('div')
        document.body.appendChild(container)
        root = createRoot(container)
        mocks.creator.mockReset().mockResolvedValue({ success: true })
        mocks.updater.mockReset().mockResolvedValue({ success: true })
        mocks.refetch.mockReset().mockResolvedValue(undefined)
        mocks.setSnack.mockReset()
    })

    afterEach(async () => {
        await act(async () => root.unmount())
        container.remove()
    })

    it('adds a primary role with the same compact action used by other editable lists', async () => {
        await act(async () => {
            root.render(
                <ThemeProvider theme={appTheme} defaultMode="dark">
                    <PrimaryRoles />
                </ThemeProvider>,
            )
        })

        const addButton = Array.from(container.querySelectorAll('button')).find((button) =>
            button.textContent?.includes('Add primary role'),
        )
        expect(addButton).toBeDefined()

        await act(async () => {
            addButton?.click()
        })

        expect(mocks.creator).toHaveBeenCalledWith('add_primary_role', {
            organizationId: 'org-1',
            name: 'New primary role',
            index: 2,
            softDelete: false,
        })
        expect(mocks.refetch).toHaveBeenCalledOnce()
    })

    it('moves primary roles by swapping their saved positions', async () => {
        await act(async () => {
            root.render(
                <ThemeProvider theme={appTheme} defaultMode="dark">
                    <PrimaryRoles />
                </ThemeProvider>,
            )
        })

        const moveDown = container.querySelector('[aria-label="Move Faculty down"]') as HTMLButtonElement
        await act(async () => {
            moveDown.click()
        })

        expect(mocks.updater).toHaveBeenCalledTimes(2)
        expect(mocks.updater).toHaveBeenCalledWith('update_primary_role', { id: 'role-1', index: 1 })
        expect(mocks.updater).toHaveBeenCalledWith('update_primary_role', { id: 'role-2', index: 0 })
        expect(mocks.refetch).toHaveBeenCalledOnce()
    })
})
