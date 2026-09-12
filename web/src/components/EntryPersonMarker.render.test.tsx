// @vitest-environment jsdom

import { act } from 'react'
import { createRoot } from 'react-dom/client'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { PersonType } from '../types/majorTypes'
import { EntryPersonMarker } from './EntryPersonMarker'
;(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true

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
})
