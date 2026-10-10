// @vitest-environment jsdom
import React, { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { PersonFinder } from './PersonFinder'
import { PersonForm } from './AddPerson/PersonForm'
import { PersonCardDialog } from './PersonCardDialog'
import { useSessionSalt } from '../libraries/useSessionSalt'
import { hashPersonName } from '../tools/useHashName'
import type { PersonType } from '../types/majorTypes'
;(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true
const mocks = vi.hoisted(() => ({ getter: vi.fn(), creator: vi.fn(), updater: vi.fn(), invalidateQueries: vi.fn() }))
vi.mock('../tools/db_tools/getter', () => ({ getter: mocks.getter }))
vi.mock('../tools/db_tools/creator', () => ({ creator: mocks.creator }))
vi.mock('../tools/db_tools/updater', () => ({ updater: mocks.updater }))
vi.mock('../tools/useOrganization', () => ({ useOrganization: () => ({ id: 'org-1' }) }))
vi.mock('../tools/usePicklists', () => ({ usePicklists: () => ({ items: [] }) }))
vi.mock('../tools/db_tools/useGetter', () => ({ useGetter: () => ({ data: [], isLoading: false }) }))
vi.mock('@tanstack/react-query', () => ({ useQueryClient: () => ({ invalidateQueries: mocks.invalidateQueries }) }))
vi.mock('./PersonAvatar', () => ({ PersonAvatar: () => <span>Avatar</span> }))
const person: PersonType = {
    id: 'person-1',
    organizationId: 'org-1',
    monsterSeed: 'seed',
    monsterVersion: 1,
    gender: 'Woman',
    generation: 'Gen X',
    race: 'Hidden detail',
    primaryRole: 'Staff',
    isInternational: false,
    category1: '',
    category2: '',
    category3: '',
}
let root: Root, container: HTMLDivElement
function button(text: string) {
    return [...document.body.querySelectorAll('button')].find((item) => item.textContent === text)!
}
function input(label: string) {
    const element = [...document.body.querySelectorAll('label')].find((item) => item.textContent === label)!
    return document.getElementById(element.htmlFor) as HTMLInputElement
}
async function fill(label: string, value: string) {
    await act(async () => {
        const field = input(label)
        Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!.call(field, value)
        field.dispatchEvent(new Event('input', { bubbles: true }))
    })
}
async function click(text: string) {
    await act(async () => {
        button(text).click()
        await Promise.resolve()
    })
}
beforeEach(() => {
    mocks.getter.mockReset().mockResolvedValue([])
    mocks.creator.mockReset().mockResolvedValue({ id: 'created', monsterSeed: 'seed', monsterVersion: 1 })
    mocks.updater.mockReset().mockResolvedValue({ success: true })
    mocks.invalidateQueries.mockReset().mockResolvedValue(undefined)
    useSessionSalt.getState().clearSessionSalt()
    container = document.createElement('div')
    document.body.append(container)
    root = createRoot(container)
})
afterEach(async () => {
    await act(async () => root.unmount())
    container.remove()
    useSessionSalt.getState().clearSessionSalt()
})

describe('person index card workflow', () => {
    it('offers creation only after a completed no-match search, forwarding both exact inputs', async () => {
        const create = vi.fn()
        await act(async () => root.render(<PersonFinder onCreateRequest={create} />))
        expect(button('Create new person')).toBeUndefined()
        await fill('Full Name', 'Taylor Lee')
        await fill('Phrase', 'phrase with spaces ')
        expect(mocks.getter).not.toHaveBeenCalled()
        await click('Find person')
        await click('Create new person')
        expect(create).toHaveBeenCalledWith({ name: 'Taylor Lee', phrase: 'phrase with spaces ' })
        await fill('Phrase', 'different')
        expect(button('Create new person')).toBeUndefined()
    })
    it('does not offer creation after a network error or existing match', async () => {
        mocks.getter.mockRejectedValue(new Error('offline'))
        await act(async () => root.render(<PersonFinder onCreateRequest={vi.fn()} />))
        await fill('Full Name', 'Taylor Lee')
        await click('Find person')
        expect(document.body.textContent).toContain('could not be completed')
        expect(button('Create new person')).toBeUndefined()
        mocks.getter.mockResolvedValue([person])
        await click('Find person')
        expect(button('Create new person')).toBeUndefined()
        expect(document.body.textContent).toContain('Matching people')
    })
    it('discards an old search result after the inputs change', async () => {
        let resolve!: (value: PersonType[]) => void
        const pending = new Promise<PersonType[]>((done) => {
            resolve = done
        })
        mocks.getter.mockReturnValue(pending)
        await act(async () => root.render(<PersonFinder onCreateRequest={vi.fn()} />))
        await fill('Full Name', 'Taylor Lee')
        await click('Find person')
        await fill('Full Name', 'Other person')
        await act(async () => resolve([]))
        expect(button('Create new person')).toBeUndefined()
    })
    it('prefills creation, copies the default without saving, and rechecks changed inputs', async () => {
        const saved = vi.fn()
        useSessionSalt.getState().setSessionSalt('default phrase')
        await act(async () =>
            root.render(
                <PersonForm
                    credentials={{ name: 'Taylor Lee', phrase: 'searched phrase' }}
                    onSaved={saved}
                />,
            ),
        )
        expect(input('Full Name').value).toBe('Taylor Lee')
        expect(input('Phrase').value).toBe('searched phrase')
        expect(input('Phrase').type).toBe('password')
        await click('Copy default phrase')
        expect(input('Phrase').value).toBe('default phrase')
        expect(mocks.creator).not.toHaveBeenCalled()
        await click('Save person')
        expect(mocks.getter).toHaveBeenCalledWith(
            `get_persons_by_hashed_name/${hashPersonName('Taylor Lee', 'default phrase', 'org-1')}`,
        )
        expect(mocks.creator).toHaveBeenCalledWith(
            'add_person',
            expect.objectContaining({
                hashedName: hashPersonName('Taylor Lee', 'default phrase', 'org-1'),
                isPublic: false,
            }),
        )
        expect(saved).toHaveBeenCalled()
    })
    it('blocks creation when the final duplicate check fails or returns a match', async () => {
        await act(async () =>
            root.render(
                <PersonForm
                    credentials={{ name: 'Taylor Lee', phrase: 'phrase' }}
                    onSaved={vi.fn()}
                />,
            ),
        )
        mocks.getter.mockResolvedValue([person])
        await click('Save person')
        expect(mocks.creator).not.toHaveBeenCalled()
        expect(document.body.textContent).toContain('already exists')
        mocks.getter.mockRejectedValue(new Error('offline'))
        await click('Save person')
        expect(mocks.creator).not.toHaveBeenCalled()
    })
    it('requires both name and phrase for the selected card before exposing details or editing', async () => {
        await act(async () =>
            root.render(
                <PersonCardDialog
                    person={person}
                    onClose={vi.fn()}
                />,
            ),
        )
        expect(document.body.textContent).not.toContain('Hidden detail')
        expect(button('Edit person')).toBeUndefined()
        await fill('Full Name', 'Taylor Lee')
        await fill('Phrase', 'wrong')
        await click('Open card')
        expect(document.body.textContent).toContain('do not match')
        expect(button('Edit person')).toBeUndefined()
        mocks.getter.mockResolvedValue([person])
        await fill('Phrase', 'right')
        await click('Open card')
        expect(mocks.getter).toHaveBeenLastCalledWith(
            `get_persons_by_hashed_name/${hashPersonName('Taylor Lee', 'right', 'org-1')}`,
        )
        expect(document.body.textContent).toContain('Hidden detail')
        await click('Edit person')
        await click('Save person')
        expect(mocks.updater).toHaveBeenCalledWith(
            'update_person',
            expect.objectContaining({
                id: 'person-1',
                currentHashedName: hashPersonName('Taylor Lee', 'right', 'org-1'),
            }),
        )
    })
    it('saves a replacement phrase and details together while proving the old identity', async () => {
        const saved = vi.fn()
        await act(async () =>
            root.render(
                <PersonForm
                    person={person}
                    credentials={{ name: 'Taylor Lee', phrase: 'old' }}
                    onSaved={saved}
                />,
            ),
        )
        await click('Change phrase')
        await fill('New phrase', 'new')
        await fill('Gender', 'Updated')
        await click('Save person')
        expect(mocks.updater).toHaveBeenCalledWith(
            'update_person',
            expect.objectContaining({
                gender: 'Updated',
                currentHashedName: hashPersonName('Taylor Lee', 'old', 'org-1'),
                newHashedName: hashPersonName('Taylor Lee', 'new', 'org-1'),
            }),
        )
        expect(saved).toHaveBeenCalledWith(expect.objectContaining({ gender: 'Updated' }), {
            name: 'Taylor Lee',
            phrase: 'new',
        })
    })
})
