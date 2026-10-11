// @vitest-environment jsdom

import { act } from 'react'
import { webcrypto } from 'node:crypto'
import { useSessionSalt } from '../libraries/useSessionSalt'
import { decryptNotes } from '../tools/notesCrypto'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { PersonType } from '../types/majorTypes'
import { entryPersonChanges } from '../tools/entryPersonChanges'
import { AddEntry } from './AddEntry'
;(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true

Object.defineProperty(globalThis, 'crypto', { value: webcrypto, configurable: true })

const mocks = vi.hoisted(() => ({
    params: { caseId: 'case-1', entryId: 'entry-1' as string | undefined },
    creator: vi.fn(),
    updater: vi.fn(),
    deleter: vi.fn(),
    navigate: vi.fn(),
    invalidateQueries: vi.fn(),
    setSnack: vi.fn(),
}))

const existingPerson: PersonType = {
    id: 'person-1',
    monsterSeed: 'seed-1',
    monsterVersion: 1,
    hashedName: 'stored-person-hash',
    isPublic: false,
    gender: 'Unknown',
    generation: 'Unknown',
    race: 'Unknown',
    primaryRole: 'Visitor',
    isInternational: false,
    category1: '',
    category2: '',
    category3: '',
    organizationId: 'org-1',
}

vi.mock('react-router-dom', () => ({
    useParams: () => mocks.params,
    useNavigate: () => mocks.navigate,
}))

vi.mock('@tanstack/react-query', () => ({
    useQueryClient: () => ({ invalidateQueries: mocks.invalidateQueries }),
}))

vi.mock('../tools/db_tools/useGetter', () => ({
    useGetter: (_key: string[]) => {
        const key = _key.filter(Boolean).join('/')
        const dataByKey: Record<string, unknown> = {
            'get_case_by_id/case-1': { id: 'case-1', name: 'Example case', organizationId: 'org-1' },
            'get_persons_by_case_id/case-1': [existingPerson],
            'get_entry_by_id/entry-1': {
                id: 'entry-1',
                caseId: 'case-1',
                ombudsId: 'ombuds-1',
                organizationId: 'org-1',
                date: 'Tue, 01 Sep 2026 00:00:00 GMT',
                medium: 'Phone',
                duration: 45,
                notes: 'ombuddi_enc_v1:unchanged-ciphertext',
            },
            'get_persons_by_entry_id/entry-1': [existingPerson],
        }
        return { data: dataByKey[key], isLoading: false, isError: false }
    },
}))

vi.mock('../tools/db_tools/creator', () => ({ creator: mocks.creator }))
vi.mock('../tools/db_tools/updater', () => ({ updater: mocks.updater }))
vi.mock('../tools/db_tools/deleter', () => ({ deleter: mocks.deleter }))
vi.mock('../tools/usePicklists', () => ({
    usePicklists: (kind: string) => ({
        items: kind === 'medium' ? [{ id: 'medium-1', name: 'Phone' }] : [],
    }),
}))
vi.mock('../tools/useCurrentOmbuds', () => ({
    useCurrentOmbuds: () => ({ data: { id: 'ombuds-1' }, isLoading: false }),
}))
vi.mock('../libraries/useSnack', () => ({
    useSnack: (selector: (state: { setSnack: typeof mocks.setSnack }) => unknown) =>
        selector({ setSnack: mocks.setSnack }),
}))
vi.mock('../components/PersonFinder', () => ({ PersonFinder: () => <span /> }))
vi.mock('../components/AddPerson/PersonForm', () => ({ PersonForm: () => <span /> }))
vi.mock('../components/PersonAvatar', () => ({ PersonAvatar: () => <span /> }))
vi.mock('../components/ProtectedText', () => ({
    ProtectedText: ({ onDecrypted }: { onDecrypted: (text: string, phrase: string) => void }) => (
        <button onClick={() => onDecrypted('Original text', 'original phrase')}>Locked note</button>
    ),
}))

function button(text: string) {
    return [...document.body.querySelectorAll('button')].find((button) => button.textContent === text)!
}
async function click(text: string) {
    await act(async () => {
        button(text).click()
        await new Promise((resolve) => setTimeout(resolve, 150))
    })
}
async function writeNotes(text: string) {
    const textarea = document.querySelector<HTMLTextAreaElement>('textarea[aria-label="Entry notes"]')!
    await act(async () => {
        Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value')!.set!.call(textarea, text)
        textarea.dispatchEvent(new Event('input', { bubbles: true }))
    })
}

describe('AddEntry edit mode', () => {
    let container: HTMLDivElement
    let root: Root

    beforeEach(() => {
        mocks.params.entryId = 'entry-1'
        useSessionSalt.getState().clearSessionSalt()
        container = document.createElement('div')
        document.body.append(container)
        root = createRoot(container)
        mocks.creator.mockReset().mockResolvedValue({ success: true })
        mocks.updater.mockReset().mockResolvedValue({ success: true })
        mocks.deleter.mockReset().mockResolvedValue({ success: true })
        mocks.navigate.mockReset()
        mocks.invalidateQueries.mockReset().mockResolvedValue(undefined)
        mocks.setSnack.mockReset()
    })

    afterEach(async () => {
        await act(async () => root.unmount())
        container.remove()
        useSessionSalt.getState().clearSessionSalt()
    })

    it('preserves locked note bytes while saving other entry fields', async () => {
        await act(async () => root.render(<AddEntry />))

        expect(container.textContent).toContain('Edit case note')
        expect(container.textContent).toContain('Locked note')
        const saveButton = [...container.querySelectorAll('button')].find(
            (button) => button.textContent === 'Save changes',
        )

        await act(async () => {
            saveButton?.click()
            await Promise.resolve()
        })

        expect(mocks.updater).toHaveBeenCalledWith('update_entry', {
            id: 'entry-1',
            caseId: 'case-1',
            date: '2026-09-01',
            medium: 'Phone',
            duration: 45,
            notes: 'ombuddi_enc_v1:unchanged-ciphertext',
        })
        expect(mocks.creator).not.toHaveBeenCalled()
        expect(mocks.deleter).not.toHaveBeenCalled()
        expect(mocks.navigate).toHaveBeenCalledWith('/case/case-1')
    })

    it('requires a phrase dialog and does not accept a copied default until confirmed', async () => {
        mocks.params.entryId = undefined
        useSessionSalt.getState().setSessionSalt('sample phrase')
        await act(async () => root.render(<AddEntry />))
        await writeNotes('A sample interaction')
        await click('Save entry')
        expect(mocks.creator).not.toHaveBeenCalled()
        expect(document.body.querySelector('[role="dialog"]')).not.toBeNull()
        const field = document.body.querySelector<HTMLInputElement>('input[type="password"]')!
        expect(field.value).toBe('')
        expect(button('Encrypt and save').disabled).toBe(true)
        expect(document.body.textContent).not.toContain('Blank')
        await click('Copy default phrase')
        expect(field.value).toBe('sample phrase')
        expect(field.type).toBe('password')
        expect(mocks.creator).not.toHaveBeenCalled()
        await act(async () => useSessionSalt.getState().setSessionSalt('another default'))
        await click('Encrypt and save')
        await act(async () => {
            await vi.waitFor(() => expect(mocks.navigate).toHaveBeenCalledWith('/case/case-1'))
        })
        const payload = mocks.creator.mock.calls[0][1]
        expect(payload).toMatchObject({ caseId: 'case-1', medium: 'Phone', duration: 30, personIds: [] })
        expect(await decryptNotes(payload.notes, 'sample phrase', 'org-1')).toBe('A sample interaction')
    })

    it('discards canceled phrase drafts and still requires a choice on the next save', async () => {
        mocks.params.entryId = undefined
        useSessionSalt.getState().setSessionSalt('sample phrase')
        await act(async () => root.render(<AddEntry />))
        await writeNotes('A sample interaction')
        await click('Save entry')
        await click('Copy default phrase')
        await act(async () =>
            document.body.querySelector<HTMLButtonElement>('button[aria-label="Show phrase"]')?.click(),
        )
        const dialog = document.body.querySelector('[role="dialog"]')!
        const cancel = [...dialog.querySelectorAll('button')].find((button) => button.textContent === 'Cancel')!
        await act(async () => cancel.click())
        expect(mocks.creator).not.toHaveBeenCalled()
        await click('Save entry')
        expect(document.body.querySelector<HTMLInputElement>('input[type="password"]')?.value).toBe('')
        expect(button('Encrypt and save').disabled).toBe(true)
    })

    it('stores plaintext only after the explicit turn-off confirmation', async () => {
        mocks.params.entryId = undefined
        await act(async () => root.render(<AddEntry />))
        await writeNotes('Deliberately unencrypted text')
        await click('Save entry')
        expect(button('Copy default phrase').disabled).toBe(true)
        await click('Turn off encryption')
        expect(document.body.textContent).toContain('stored without phrase encryption')
        expect(mocks.creator).not.toHaveBeenCalled()
        await click('Save without encryption')
        expect(mocks.creator).toHaveBeenCalledWith(
            'add_entry',
            expect.objectContaining({ notes: 'Deliberately unencrypted text' }),
        )
    })

    it('requires a new encryption choice for edited text without silently reusing its unlocking phrase', async () => {
        await act(async () => root.render(<AddEntry />))
        await click('Locked note')
        await writeNotes('Edited text')
        await click('Save changes')
        expect(mocks.updater).not.toHaveBeenCalled()
        const field = document.body.querySelector<HTMLInputElement>('input[type="password"]')!
        expect(field.value).toBe('')
        await act(async () => {
            Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!.call(field, 'custom phrase')
            field.dispatchEvent(new Event('input', { bubbles: true }))
        })
        await click('Encrypt and save')
        await act(async () => {
            await vi.waitFor(() => expect(mocks.navigate).toHaveBeenCalledWith('/case/case-1'))
        })
        expect(await decryptNotes(mocks.updater.mock.calls[0][1].notes, 'custom phrase', 'org-1')).toBe('Edited text')
    })

    it('keeps existing ciphertext unchanged after unlocking when only metadata is saved', async () => {
        await act(async () => root.render(<AddEntry />))
        await click('Locked note')
        await click('Save changes')
        expect(mocks.updater).toHaveBeenCalledWith(
            'update_entry',
            expect.objectContaining({ notes: 'ombuddi_enc_v1:unchanged-ciphertext' }),
        )
    })

    it('records an explicit encryption choice even for a new empty note', async () => {
        mocks.params.entryId = undefined
        await act(async () => root.render(<AddEntry />))
        await click('Save entry')
        expect(mocks.creator).not.toHaveBeenCalled()
        expect(document.body.querySelector('[role="dialog"]')).not.toBeNull()
    })

    it('saves a changed involvement role on the existing link', async () => {
        await act(async () => root.render(<AddEntry />))
        await click('Manage people')
        const selector = document.body.querySelector('[role="dialog"] [role="combobox"]')!
        expect(selector.textContent).toBe('Visitor')
        await act(async () => selector.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, button: 0 })))
        const options = [...document.body.querySelectorAll<HTMLElement>('[role="option"]')]
        expect(options.map((option) => option.textContent)).toEqual([
            'Visitor',
            'Referenced',
            'Consulted',
            'Support person',
            'Participant',
            'Other',
        ])
        await act(async () => options.find((option) => option.textContent === 'Referenced')!.click())
        await click('Done')
        expect(container.textContent).toContain('Referenced')
        await click('Save changes')
        expect(mocks.creator).toHaveBeenCalledWith('add_entry_person', {
            entryId: 'entry-1',
            personId: 'person-1',
            entryRole: 'referenced',
        })
        expect(mocks.deleter).not.toHaveBeenCalled()
    })

    it('sends the selected role with people on a newly created note', async () => {
        mocks.params.entryId = undefined
        await act(async () => root.render(<AddEntry />))
        await click('Add people')
        await act(async () => {
            document.body.querySelector<HTMLButtonElement>('button[aria-label="Add to entry: Visitor"]')!.click()
        })
        const selector = document.body.querySelector('[role="dialog"] [role="combobox"]')!
        expect(selector.textContent).toBe('Visitor')
        await act(async () => selector.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, button: 0 })))
        await act(async () => {
            ;[...document.body.querySelectorAll<HTMLElement>('[role="option"]')]
                .find((option) => option.textContent === 'Support person')!
                .click()
        })
        await click('Done')
        await click('Save entry')
        await click('Turn off encryption')
        await click('Save without encryption')
        expect(mocks.creator).toHaveBeenCalledWith(
            'add_entry',
            expect.objectContaining({
                personIds: ['person-1'],
                personRoles: { 'person-1': 'support_person' },
            }),
        )
        expect(mocks.invalidateQueries).toHaveBeenCalledWith({ queryKey: ['reports'] })
    })

    it('detects role changes independently from additions and removals', () => {
        const changes = entryPersonChanges([existingPerson], [{ ...existingPerson, entryRole: 'consulted' }])
        expect(changes.additions).toEqual([])
        expect(changes.removals).toEqual([])
        expect(changes.updates.map((person) => person.entryRole)).toEqual(['consulted'])
        expect(entryPersonChanges([existingPerson], [{ ...existingPerson, entryRole: 'visitor' }]).updates).toEqual([])
    })

    it('calculates people additions and removals without duplicating unchanged people', () => {
        const added = { ...existingPerson, id: 'person-2' }
        const changes = entryPersonChanges(
            [existingPerson, { ...existingPerson, id: 'person-3' }],
            [existingPerson, added],
        )

        expect(changes.additions.map((person) => person.id)).toEqual(['person-2'])
        expect(changes.removals).toEqual(['person-3'])
    })
})
