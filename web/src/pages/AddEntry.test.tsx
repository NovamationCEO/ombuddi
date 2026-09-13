// @vitest-environment jsdom

import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { PersonType } from '../types/majorTypes'
import { entryPersonChanges } from '../tools/entryPersonChanges'
import { AddEntry } from './AddEntry'
;(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true

const mocks = vi.hoisted(() => ({
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
    useParams: () => ({ caseId: 'case-1', entryId: 'entry-1' }),
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
vi.mock('../components/ProtectedText', () => ({ ProtectedText: () => <span>Locked note</span> }))

describe('AddEntry edit mode', () => {
    let container: HTMLDivElement
    let root: Root

    beforeEach(() => {
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

    it('calculates people additions and removals without duplicating unchanged people', () => {
        const added = { ...existingPerson, id: 'person-2' }
        const changes = entryPersonChanges(['person-1', 'person-3'], [existingPerson, added])

        expect(changes.additions.map((person) => person.id)).toEqual(['person-2'])
        expect(changes.removals).toEqual(['person-3'])
    })
})
