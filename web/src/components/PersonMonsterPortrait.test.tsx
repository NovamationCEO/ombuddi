// @vitest-environment jsdom

import { act, type ReactNode } from 'react'
import { createRoot } from 'react-dom/client'
import { describe, expect, it } from 'vitest'
import { PersonMonster, PersonMonsterAvatar } from './PersonMonsterPortrait'

;(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true

async function renderIntoContainer(element: ReactNode) {
    const container = document.createElement('div')
    const root = createRoot(container)
    await act(async () => root.render(element))
    return { container, root }
}

describe('PersonMonster', () => {
    it('renders a local SVG rather than requesting an image', async () => {
        const { container, root } = await renderIntoContainer(
            <PersonMonster seed="37b5d34c-d7cc-4f02-9f98-41deef664c35" />,
        )

        expect(container.querySelector('svg')).not.toBeNull()
        expect(container.querySelector('img')).toBeNull()
        await act(async () => root.unmount())
    })

    it('renders different seeds as different portraits', async () => {
        const first = await renderIntoContainer(
            <PersonMonster seed="37b5d34c-d7cc-4f02-9f98-41deef664c35" />,
        )
        const second = await renderIntoContainer(
            <PersonMonster seed="e43c49c3-e758-458f-b7e0-911c374ad217" />,
        )

        expect(first.container.innerHTML).not.toEqual(second.container.innerHTML)
        await act(async () => first.root.unmount())
        await act(async () => second.root.unmount())
    })

    it('wraps the portrait at the requested avatar size', async () => {
        const { container, root } = await renderIntoContainer(
            <PersonMonsterAvatar
                seed="37b5d34c-d7cc-4f02-9f98-41deef664c35"
                size={44}
            />,
        )

        expect(container.querySelector('.MuiAvatar-root')).not.toBeNull()
        expect(container.querySelector('svg')).not.toBeNull()
        await act(async () => root.unmount())
    })
})
