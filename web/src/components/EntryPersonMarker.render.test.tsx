// @vitest-environment jsdom

import { act } from 'react'
import { createRoot } from 'react-dom/client'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { PersonType } from '../types/majorTypes'
import { useSessionSalt } from '../libraries/useSessionSalt'
import { useVerifiedPersonNames } from '../libraries/useVerifiedPersonNames'
import { hashPersonName } from '../tools/useHashName'
import { EntryPersonMarker } from './EntryPersonMarker'
;(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true

const getterMock = vi.hoisted(() => vi.fn())

vi.mock('../tools/db_tools/getter', () => ({ getter: getterMock }))

vi.mock('./PersonAvatar', () => ({
    PersonAvatar: ({ size }: { size: number }) => <span data-avatar-size={size} />,
}))

const person: PersonType = {
    id: 'person-1',
    monsterSeed: '37b5d34c-d7cc-4f02-9f98-41deef664c35',
    monsterVersion: 1,
    hashedName: 'never-display-this',
    isPublic: false,
    gender: 'Woman',
    generation: 'Millennial',
    race: 'Multiracial',
    primaryRole: 'Faculty',
    isInternational: false,
    category1: '',
    category2: '',
    category3: '',
    organizationId: 'never-display-this-either',
}

describe('EntryPersonMarker interaction', () => {
    afterEach(() => {
        getterMock.mockReset()
        useSessionSalt.getState().clearSessionSalt()
        useVerifiedPersonNames.getState().clearVerifiedNames()
        document.body.replaceChildren()
    })

    it('uses a larger avatar and reveals safe details on hover', async () => {
        const container = document.createElement('div')
        document.body.append(container)
        const root = createRoot(container)
        await act(async () => root.render(<EntryPersonMarker person={person} />))

        expect(container.querySelector('[data-avatar-size="46"]')).not.toBeNull()
        const marker = container.querySelector('[tabindex="0"]')
        expect(marker).not.toBeNull()
        expect(container.textContent).not.toContain('Woman')

        await act(async () => {
            marker?.dispatchEvent(new MouseEvent('mouseover', { bubbles: true }))
            await new Promise((resolve) => setTimeout(resolve, 350))
        })

        expect(document.body.textContent).toContain('Race')
        expect(document.body.textContent).toContain('Multiracial')
        expect(document.body.textContent).toContain('Gender')
        expect(document.body.textContent).toContain('Woman')
        expect(document.body.textContent).not.toContain(person.hashedName)
        expect(document.body.textContent).not.toContain(person.organizationId)

        await act(async () => root.unmount())
    })

    it('shows a public name beneath the avatar', async () => {
        const container = document.createElement('div')
        document.body.append(container)
        const root = createRoot(container)
        await act(async () =>
            root.render(
                <EntryPersonMarker
                    person={{ ...person, isPublic: true, publicName: 'Jordan Lee' }}
                />,
            ),
        )

        expect(container.textContent).toContain('Jordan Lee')

        await act(async () => root.unmount())
    })

    it('verifies a private name for every matching avatar without persisting it', async () => {
        useSessionSalt.getState().setSessionSalt('shared phrase')
        getterMock.mockResolvedValue([person])

        const container = document.createElement('div')
        document.body.append(container)
        const root = createRoot(container)
        await act(async () =>
            root.render(
                <>
                    <EntryPersonMarker person={person} />
                    <EntryPersonMarker person={person} />
                </>,
            ),
        )

        expect(container.textContent).not.toContain('Jordan Lee')
        const marker = container.querySelector('[tabindex="0"]')
        await act(async () => {
            marker?.dispatchEvent(new MouseEvent('dblclick', { bubbles: true }))
        })

        const inputs = [...document.body.querySelectorAll('input')]
        expect(inputs).toHaveLength(2)
        expect(inputs.every((input) => input.hasAttribute('data-1p-ignore'))).toBe(true)
        expect(inputs.every((input) => input.hasAttribute('data-op-ignore'))).toBe(true)
        expect(inputs[1].value).toBe('shared phrase')

        await act(async () => {
            const valueSetter = Object.getOwnPropertyDescriptor(
                HTMLInputElement.prototype,
                'value',
            )?.set
            valueSetter?.call(inputs[0], 'Jordan Lee')
            inputs[0].dispatchEvent(new Event('input', { bubbles: true }))
        })

        const form = document.body.querySelector('form')
        await act(async () => {
            form?.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }))
            await Promise.resolve()
        })

        expect(getterMock).toHaveBeenCalledWith(
            `get_persons_by_hashed_name/${hashPersonName('Jordan Lee', 'shared phrase', person.organizationId)}`,
        )
        expect(container.textContent?.match(/Jordan Lee/g)).toHaveLength(2)
        expect(useVerifiedPersonNames.getState().names[person.id]).toBe('Jordan Lee')

        await act(async () => root.unmount())
    })
})
