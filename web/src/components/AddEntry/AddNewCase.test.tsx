// @vitest-environment jsdom

import React, { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { ThemeProvider } from '@mui/material/styles'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { appTheme } from '../../theme/appTheme'
import { AddNewCase } from './AddNewCase'
import { useSessionSalt } from '../../libraries/useSessionSalt'
;(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true

const mocks = vi.hoisted(() => ({
    creator: vi.fn(),
    navigate: vi.fn(),
    setSnack: vi.fn(),
    encrypt: vi.fn().mockResolvedValue('encrypted-description'),
    referralOptions: [
        { id: '10000000-0000-0000-0000-000000000001', name: 'HR', behavior: 'standard' },
        { id: '10000000-0000-0000-0000-000000000002', name: 'Employee assistance program', behavior: 'standard' },
        { id: '10000000-0000-0000-0000-000000000003', name: 'External resource', behavior: 'standard' },
        { id: '10000000-0000-0000-0000-000000000004', name: 'General counsel', behavior: 'standard' },
        { id: '10000000-0000-0000-0000-000000000005', name: 'Supervisor', behavior: 'standard' },
        { id: '10000000-0000-0000-0000-000000000006', name: 'Peer or colleague', behavior: 'standard' },
        { id: '10000000-0000-0000-0000-000000000007', name: 'Friend or family member', behavior: 'standard' },
        { id: '10000000-0000-0000-0000-000000000008', name: 'Presentation or event', behavior: 'standard' },
        { id: '10000000-0000-0000-0000-000000000009', name: 'Poster or brochure', behavior: 'standard' },
        { id: '10000000-0000-0000-0000-000000000010', name: 'Internet search', behavior: 'standard' },
        { id: '10000000-0000-0000-0000-000000000011', name: 'Other (please specify)', behavior: 'other_detail' },
        { id: '10000000-0000-0000-0000-000000000012', name: 'Unknown', behavior: 'exclusive' },
    ].map((option, index) => ({
        ...option,
        organizationId: 'org-1',
        kind: 'referral_source',
        description: '',
        index,
        softDelete: false,
    })),
}))

vi.mock('react-router-dom', () => ({
    useNavigate: () => mocks.navigate,
}))

vi.mock('../../libraries/useSnack', () => ({
    useSnack: (selector: (state: { setSnack: typeof mocks.setSnack }) => unknown) =>
        selector({ setSnack: mocks.setSnack }),
}))

vi.mock('../../tools/useOrganization', () => ({
    useOrganization: () => ({ id: 'org-1', name: 'Example Organization' }),
}))

vi.mock('../../tools/useCodeSource', () => ({
    useCodeSource: (source: { kind: string }) => ({
        title: source.kind === 'ioa' ? 'IOA Codes' : 'Organization Codes',
        isReady: true,
        codes: [{ id: source.kind + '-1', code: '2E', description: 'Communication', categoryId: 'category-1' }],
        codeCategories: [{ id: 'category-1', name: 'Relationships', index: 0 }],
    }),
}))

vi.mock('../../tools/notesCrypto', () => ({ encryptProtectedText: mocks.encrypt }))

vi.mock('../../tools/usePicklists', () => ({
    usePicklists: () => ({
        items: mocks.referralOptions,
        allItems: mocks.referralOptions,
        isLoading: false,
        refetch: vi.fn(),
    }),
}))

vi.mock('../../tools/db_tools/creator', () => ({
    creator: mocks.creator,
}))

function checkboxFor(container: HTMLElement, labelText: string) {
    const label = Array.from(container.querySelectorAll('label')).find((item) => item.textContent?.includes(labelText))
    return label?.querySelector<HTMLInputElement>('input[type="checkbox"]')
}

function buttonFor(container: HTMLElement, text: string) {
    return Array.from(container.querySelectorAll('button')).find((button) => button.textContent === text)
}

function setInputValue(input: HTMLInputElement | HTMLTextAreaElement, value: string) {
    Object.getOwnPropertyDescriptor(
        input instanceof HTMLTextAreaElement ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype,
        'value',
    )?.set?.call(input, value)
    input.dispatchEvent(new Event('input', { bubbles: true }))
}

function fieldForLabel(container: HTMLElement, labelText: string) {
    const label = Array.from(container.querySelectorAll('label')).find((item) => item.textContent?.includes(labelText))
    return label?.htmlFor ? container.querySelector<HTMLElement>(`[id="${label.htmlFor}"]`) : null
}

describe('AddNewCase', () => {
    let container: HTMLDivElement
    let root: Root

    beforeEach(() => {
        container = document.createElement('div')
        document.body.appendChild(container)
        root = createRoot(container)
        useSessionSalt.getState().clearSessionSalt()
        mocks.encrypt.mockClear()
        mocks.creator.mockReset().mockResolvedValue({ success: true, status: 'success', id: 'case-1' })
        mocks.navigate.mockReset()
        mocks.setSnack.mockReset()
    })

    afterEach(async () => {
        await act(async () => root.unmount())
        container.remove()
    })

    it('starts with every referral source unchecked', async () => {
        await act(async () => {
            root.render(
                <ThemeProvider
                    theme={appTheme}
                    defaultMode="dark"
                >
                    <AddNewCase />
                </ThemeProvider>,
            )
        })

        expect(buttonFor(container, 'Edit sources')?.getAttribute('aria-expanded')).toBe('false')
        await act(async () => buttonFor(container, 'Edit sources')?.click())

        const referralCheckboxes = Array.from(container.querySelectorAll<HTMLInputElement>('input[type="checkbox"]'))
        expect(referralCheckboxes).toHaveLength(12)
        expect(referralCheckboxes.every((checkbox) => !checkbox.checked)).toBe(true)
    })

    it('returns to the Cases page when Cancel is selected', async () => {
        await act(async () => {
            root.render(
                <ThemeProvider
                    theme={appTheme}
                    defaultMode="dark"
                >
                    <AddNewCase />
                </ThemeProvider>,
            )
        })

        const cancelButton = Array.from(container.querySelectorAll('button')).find(
            (button) => button.textContent === 'Cancel',
        )
        await act(async () => cancelButton?.click())

        expect(mocks.navigate).toHaveBeenCalledWith('/cases')
        expect(mocks.creator).not.toHaveBeenCalled()
    })

    it('requires detail for Other and treats Unknown as mutually exclusive', async () => {
        await act(async () => {
            root.render(
                <ThemeProvider
                    theme={appTheme}
                    defaultMode="dark"
                >
                    <AddNewCase />
                </ThemeProvider>,
            )
        })

        await act(async () => buttonFor(container, 'Edit sources')?.click())
        await act(async () => {
            checkboxFor(container, 'HR')?.click()
            checkboxFor(container, 'Other (please specify)')?.click()
        })
        expect(fieldForLabel(container, 'Please specify the other referral source')).not.toBeNull()
        expect(checkboxFor(container, 'HR')?.checked).toBe(true)

        await act(async () => {
            checkboxFor(container, 'Unknown')?.click()
        })
        const checked = Array.from(container.querySelectorAll<HTMLInputElement>('input[type="checkbox"]')).filter(
            (checkbox) => checkbox.checked,
        )
        expect(checked).toEqual([checkboxFor(container, 'Unknown')])
        expect(fieldForLabel(container, 'Please specify the other referral source')).toBeNull()
    })

    it('includes selected referral source ids in the create-case request', async () => {
        await act(async () => {
            root.render(
                <ThemeProvider
                    theme={appTheme}
                    defaultMode="dark"
                >
                    <AddNewCase />
                </ThemeProvider>,
            )
        })

        await act(async () => buttonFor(container, 'Edit sources')?.click())
        const caseName = Array.from(container.querySelectorAll('input')).find((input) =>
            input.labels?.[0]?.textContent?.includes('Case Name'),
        )
        await act(async () => {
            if (caseName) setInputValue(caseName, 'Referral persistence case')
            checkboxFor(container, 'HR')?.click()
        })
        const saveButton = Array.from(container.querySelectorAll('button')).find(
            (button) => button.textContent === 'Create case',
        )
        await act(async () => {
            saveButton?.click()
        })

        expect(mocks.creator).toHaveBeenCalledWith(
            'create_case',
            expect.objectContaining({
                name: 'Referral persistence case',
                referralSources: [{ id: '10000000-0000-0000-0000-000000000001' }],
            }),
        )
    })

    it('reopens hidden referral details when Other is incomplete', async () => {
        await act(async () =>
            root.render(
                <ThemeProvider theme={appTheme}>
                    <AddNewCase />
                </ThemeProvider>,
            ),
        )
        await act(async () => {
            setInputValue(fieldForLabel(container, 'Case Name') as HTMLInputElement, 'Test case')
            buttonFor(container, 'Edit sources')?.click()
        })
        await act(async () => checkboxFor(container, 'Other (please specify)')?.click())
        await act(async () => buttonFor(container, 'Done')?.click())
        await act(async () => buttonFor(container, 'Create case')?.click())
        expect(mocks.creator).not.toHaveBeenCalled()
        expect(container.textContent).toContain('Please specify the referral source.')
        expect(container.querySelector('[aria-controls="case-referral-controls"]')?.getAttribute('aria-expanded')).toBe(
            'true',
        )
    })

    it('opens missing protection settings and keeps free text editable through the first character', async () => {
        await act(async () =>
            root.render(
                <ThemeProvider theme={appTheme}>
                    <AddNewCase />
                </ThemeProvider>,
            ),
        )
        await act(async () => {
            setInputValue(fieldForLabel(container, 'Case Name') as HTMLInputElement, 'Test case')
            setInputValue(fieldForLabel(container, 'Description') as HTMLTextAreaElement, 'Private description')
        })
        expect(
            container.querySelector('[aria-controls="case-protection-controls"]')?.getAttribute('aria-expanded'),
        ).toBe('true')
        await act(async () => buttonFor(container, 'Create case')?.click())
        expect(mocks.creator).not.toHaveBeenCalled()
        await act(async () => buttonFor(container, 'Free text')?.click())
        await act(async () => setInputValue(fieldForLabel(container, 'Free text') as HTMLInputElement, 'f'))
        expect(
            container.querySelector('[aria-controls="case-protection-controls"]')?.getAttribute('aria-expanded'),
        ).toBe('true')
        await act(async () => setInputValue(fieldForLabel(container, 'Free text') as HTMLInputElement, 'full phrase'))
        await act(async () => buttonFor(container, 'Create case')?.click())
        expect(mocks.encrypt).toHaveBeenCalledWith('Private description', 'full phrase', 'org-1')
        expect(mocks.creator).toHaveBeenCalledWith(
            'create_case',
            expect.objectContaining({ description: 'encrypted-description' }),
        )
    })

    it('shows the session-default status without exposing the phrase', async () => {
        useSessionSalt.getState().setSessionSalt('never-render-this-phrase')
        await act(async () =>
            root.render(
                <ThemeProvider theme={appTheme}>
                    <AddNewCase />
                </ThemeProvider>,
            ),
        )
        expect(container.textContent).toContain('Using session default')
        expect(container.innerHTML).not.toContain('never-render-this-phrase')
        await act(async () => buttonFor(container, 'Change')?.click())
        await act(async () => buttonFor(container, 'Blank')?.click())
        expect(container.textContent).toContain('No phrase-based protection beyond organization separation.')
    })

    it('adds flags from both code sets and removes a flag before saving', async () => {
        await act(async () =>
            root.render(
                <ThemeProvider theme={appTheme}>
                    <AddNewCase />
                </ThemeProvider>,
            ),
        )
        await act(async () => setInputValue(fieldForLabel(container, 'Case Name') as HTMLInputElement, 'Flag test'))
        for (const label of ['Add IOA code', 'Add org code']) {
            await act(async () => buttonFor(container, label)?.click())
            const dialog = Array.from(document.querySelectorAll<HTMLElement>('[role="dialog"]')).find(
                (item) => item.closest('[aria-hidden="true"]') === null,
            )!
            expect(dialog).toBeTruthy()
            const toggle = dialog.querySelector<HTMLInputElement>('input')!
            expect(toggle).not.toBeNull()
            await act(async () => toggle.click())
            expect(toggle.checked).toBe(true)
            await act(async () => buttonFor(dialog, 'Save')?.click())
        }
        expect(container.querySelectorAll('.case-code-flag')).toHaveLength(2)
        await act(async () =>
            container.querySelector<HTMLButtonElement>('[aria-label="Remove IOA Codes: 2E Communication"]')?.click(),
        )
        expect(container.querySelectorAll('.case-code-flag')).toHaveLength(1)
        await act(async () => buttonFor(container, 'Create case')?.click())
        expect(mocks.creator).toHaveBeenCalledWith('create_case', expect.objectContaining({ codes: ['org-1'] }))
    })
})
