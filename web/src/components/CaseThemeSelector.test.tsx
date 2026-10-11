// @vitest-environment jsdom
import React, { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { CaseThemeSelector } from './CaseThemeSelector'
import { CaseThemes } from './CaseThemes'
import { normalizeCaseThemes } from '../tools/caseThemes'
;(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true
const mocks = vi.hoisted(() => ({ update: vi.fn(), invalidate: vi.fn(), snack: vi.fn() }))
vi.mock('../tools/usePicklists', () => ({
    usePicklists: () => ({ items: [{ name: 'Advising Issues' }, { name: 'Title IX' }], isLoading: false }),
}))
vi.mock('../tools/db_tools/updater', () => ({ updater: mocks.update }))
vi.mock('@tanstack/react-query', () => ({ useQueryClient: () => ({ invalidateQueries: mocks.invalidate }) }))
vi.mock('../libraries/useSnack', () => ({
    useSnack: (select: (s: { setSnack: typeof mocks.snack }) => unknown) => select({ setSnack: mocks.snack }),
}))
let root: Root, container: HTMLDivElement
beforeEach(() => {
    vi.clearAllMocks()
    mocks.update.mockResolvedValue({ success: true })
    mocks.invalidate.mockResolvedValue(undefined)
    container = document.createElement('div')
    document.body.append(container)
    root = createRoot(container)
})
afterEach(async () => {
    await act(async () => root.unmount())
    container.remove()
})
async function click(text: string) {
    await act(async () => [...document.body.querySelectorAll('button')].find((b) => b.textContent === text)!.click())
}
async function type(value: string) {
    await act(async () => {
        const input = document.body.querySelector<HTMLInputElement>('input[role="combobox"]')!
        input.focus()
        Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!.call(input, value)
        input.dispatchEvent(new Event('input', { bubbles: true }))
    })
}
describe('case themes', () => {
    it('deduplicates names while keeping the spelling of shared suggestions', () => {
        expect(normalizeCaseThemes([' title  ix ', 'TITLE IX'], ['Title IX'])).toEqual(['Title IX'])
    })
    it('retains retired case values without offering them as suggestions', async () => {
        await act(async () =>
            root.render(
                <CaseThemeSelector
                    value={['Retired Theme']}
                    onChange={vi.fn()}
                />,
            ),
        )
        expect(container.textContent).toContain('Retired Theme')
        await type('')
        await act(async () =>
            document.body
                .querySelector('input')!
                .dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true })),
        )
        const options = [...document.body.querySelectorAll('[role="option"]')].map((o) => o.textContent)
        expect(options).toContain('Advising Issues')
        expect(options).not.toContain('Retired Theme')
    })
    it('commits a newly typed theme on blur, then saves it with retained themes', async () => {
        const saved = vi.fn()
        await act(async () =>
            root.render(
                <CaseThemes
                    caseId="case-1"
                    value={['Retired Theme']}
                    onSaved={saved}
                />,
            ),
        )
        await click('Add / edit themes')
        await type('New Theme')
        await act(async () => document.body.querySelector<HTMLInputElement>('input[role="combobox"]')!.blur())
        await click('Save themes')
        expect(mocks.update).toHaveBeenCalledWith('update_case_themes', {
            caseId: 'case-1',
            themes: ['Retired Theme', 'New Theme'],
        })
        expect(saved).toHaveBeenCalled()
        expect(mocks.invalidate).toHaveBeenCalledWith({ queryKey: ['get_picklists_by_organization_id'] })
    })
    it('keeps draft changes local when canceled and keeps the editor open on save failure', async () => {
        await act(async () =>
            root.render(
                <CaseThemes
                    caseId="case-1"
                    value={['Retired Theme']}
                    onSaved={vi.fn()}
                />,
            ),
        )
        await click('Add / edit themes')
        await type('Unwanted')
        await click('Cancel')
        expect(mocks.update).not.toHaveBeenCalled()
        await click('Add / edit themes')
        expect(document.body.querySelector('[role="dialog"]')!.textContent).not.toContain('Unwanted')
        mocks.update.mockRejectedValue(new Error('offline'))
        await click('Save themes')
        expect(document.body.querySelector('[role="dialog"]')).not.toBeNull()
        expect(mocks.snack).toHaveBeenCalledWith({ message: 'offline', severity: 'error' })
    })
})
