// @vitest-environment jsdom
import React, { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { ThemeProvider } from '@mui/material/styles'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { appTheme } from '../theme/appTheme'
import { ioaCodesFull } from '../constants/ioaConstants'
import { CaseSummary } from './CaseSummary'
;(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true
const mocks = vi.hoisted(() => ({
    data: {} as Record<string, unknown>,
    navigate: vi.fn(),
    update: vi.fn(),
    refetch: vi.fn(),
    snack: vi.fn(),
}))
vi.mock('@tanstack/react-query', () => ({
    useQueryClient: () => ({ invalidateQueries: vi.fn().mockResolvedValue(undefined) }),
}))

vi.mock('react-router-dom', () => ({ useParams: () => ({ caseId: 'case-1' }), useNavigate: () => mocks.navigate }))
vi.mock('../tools/db_tools/useGetter', () => ({
    useGetter: (key: string[]) => ({ data: mocks.data[key.join('/')], isLoading: false, refetch: mocks.refetch }),
}))
vi.mock('../tools/useCurrentOmbuds', () => ({
    useCurrentOmbuds: () => ({ data: { id: 'me', personAvatarStyle: 'geometric' }, isLoading: false }),
}))
vi.mock('../tools/db_tools/updater', () => ({ updater: mocks.update }))
vi.mock('../libraries/useSnack', () => ({
    useSnack: (select: (s: { setSnack: typeof mocks.snack }) => unknown) => select({ setSnack: mocks.snack }),
}))
vi.mock('../tools/useProtectedText', () => ({
    useProtectedText: (stored: string) => ({
        encrypted: stored.startsWith('ombuddi_enc_v1:'),
        plaintext: stored.startsWith('ombuddi_enc_v1:') ? null : stored,
        phraseUsed: stored.startsWith('ombuddi_enc_v1:') ? null : '',
        status: 'failed',
    }),
}))
function button(text: string, scope: ParentNode = document.body) {
    return [...scope.querySelectorAll('button')].find((el) => el.textContent?.includes(text))!
}

describe('CaseSummary open folder', () => {
    let root: Root
    let container: HTMLDivElement
    beforeEach(() => {
        vi.clearAllMocks()
        mocks.update.mockResolvedValue({ success: true })
        mocks.data = {
            'get_case_by_id/case-1': {
                id: 'case-1',
                organizationId: 'org-1',
                name: 'Cedar / River / Lantern',
                status: 'active',
                description: 'ombuddi_enc_v1:locked',
                codes: [ioaCodesFull[0].id, 'org-code'],
                createdAt: new Date('2026-09-12'),
                updatedAt: new Date('2026-10-09'),
            },
            get_current_organization: { id: 'org-1', name: 'Example' },
            'get_codes_by_organization_id/org-1': [
                { id: 'org-code', code: 'W1', description: 'Workplace', categoryId: 'org-cat' },
            ],
            'get_code_categories_by_organization_id/org-1': [{ id: 'org-cat', name: 'Work', index: 0 }],
            'get_entries_by_case_id/case-1': [
                {
                    id: 'older',
                    ombudsId: 'someone-else',
                    date: '2026-10-02',
                    medium: 'Email',
                    duration: 15,
                    notes: 'Earlier note',
                },
                {
                    id: 'latest',
                    ombudsId: 'me',
                    date: '2026-10-09',
                    medium: 'Video call',
                    duration: 45,
                    notes: 'Latest note',
                },
            ],
            'get_case_referral_sources/case-1': [{ id: 'peer', name: 'Peer or colleague', behavior: 'standard' }],
            'get_persons_by_case_id/case-1': [],
            'get_persons_by_entry_id/latest': [],
            'get_persons_by_entry_id/older': [],
            'get_picklists_by_organization_id/org-1': [
                { id: 'peer', name: 'Peer or colleague', kind: 'referral_source', behavior: 'standard', index: 0 },
            ],
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
        await act(async () =>
            root.render(
                <ThemeProvider
                    theme={appTheme}
                    defaultMode="dark"
                >
                    <CaseSummary />
                </ThemeProvider>,
            ),
        )
    }

    it('selects the newest entry and only offers editing for its author', async () => {
        await render()
        const activities = [...container.querySelectorAll<HTMLButtonElement>('.case-review-activity button')]
        expect(activities[0].textContent).toContain('Oct 9, 2026')
        expect(activities[0].getAttribute('aria-pressed')).toBe('true')
        expect(container.querySelector('#case-entry-details')?.textContent).toContain('Latest note')
        await act(async () => button('Edit entry').click())
        expect(mocks.navigate).toHaveBeenCalledWith('/case/case-1/entry/latest/edit')
        await act(async () => activities[1].click())
        expect(container.querySelector('#case-entry-details')?.textContent).toContain('Earlier note')
        expect(button('Edit entry', container)).toBeUndefined()
        expect(activities[1].getAttribute('aria-pressed')).toBe('true')
    })

    it('separates both flag sets and opens the existing code editor', async () => {
        await render()
        expect(container.querySelector('[aria-label="IOA Codes"]')?.textContent).toContain('Compensation')
        expect(container.querySelector('[aria-label="Organization Codes"]')?.textContent).toContain('Workplace')
        await act(async () =>
            container.querySelector<HTMLButtonElement>('[aria-label="Add organization code"]')!.click(),
        )
        expect(document.querySelector('[role="dialog"]')?.textContent).toContain('Edit Codes')
    })

    it('preserves locked description ciphertext while changing case details', async () => {
        await render()
        expect(button('Unlock description')).toBeDefined()
        await act(async () => button('Edit case details').click())
        const dialog = document.querySelector('[role="dialog"]')!
        expect(dialog.querySelector('textarea')?.disabled).toBe(true)
        const name = dialog.querySelector('input')!
        await act(async () => {
            Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!.call(name, 'Renamed case')
            name.dispatchEvent(new Event('input', { bubbles: true }))
        })
        await act(async () => button('Save changes', dialog).click())
        expect(mocks.update).toHaveBeenCalledWith(
            'update_case',
            expect.objectContaining({ name: 'Renamed case', description: 'ombuddi_enc_v1:locked' }),
        )
    })

    it('retains referral editing and add-entry navigation', async () => {
        await render()
        await act(async () => button('Add entry').click())
        expect(mocks.navigate).toHaveBeenCalledWith('/case/case-1/add_entry')
        await act(async () =>
            container.querySelector<HTMLButtonElement>('[aria-label="Edit referral sources"]')!.click(),
        )
        const dialog = document.querySelector('[role="dialog"]')!
        expect(dialog.querySelector<HTMLInputElement>('input[type="checkbox"]')?.checked).toBe(true)
        await act(async () => button('Save referral sources', dialog).click())
        expect(mocks.update).toHaveBeenCalledWith('update_case_referral_sources', {
            caseId: 'case-1',
            referralSources: [{ id: 'peer' }],
        })
    })

    it.each(['me', 'someone-else'])('keeps General activity restrictions for owner %s', async (ownerOmbudsId) => {
        mocks.data['get_case_by_id/case-1'] = {
            ...(mocks.data['get_case_by_id/case-1'] as object),
            caseKind: 'general',
            name: 'General activity',
            ownerOmbudsId,
        }
        mocks.data['get_entries_by_case_id/case-1'] = []
        await render()
        expect(container.querySelector('[aria-label="Case codes"]')).toBeNull()
        expect(container.querySelector('[aria-label="Edit referral sources"]')).toBeNull()
        expect(button('Edit case details', container)).toBeUndefined()
        expect(Boolean(button('Add entry', container))).toBe(ownerOmbudsId === 'me')
        expect(container.textContent).toContain('No activity yet')
    })
})
