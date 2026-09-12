// @vitest-environment jsdom

import { act } from 'react'
import { createRoot } from 'react-dom/client'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { PersonAvatar } from './PersonAvatar'
;(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true

const mocks = vi.hoisted(() => ({
    style: 'monster' as 'monster' | 'geometric',
}))

vi.mock('../tools/useCurrentOmbuds', () => ({
    useCurrentOmbuds: () => ({
        data: { personAvatarStyle: mocks.style },
        isLoading: false,
    }),
}))

describe('PersonAvatar', () => {
    beforeEach(() => {
        mocks.style = 'monster'
    })

    it('uses the current user monster preference by default', async () => {
        const container = document.createElement('div')
        const root = createRoot(container)
        await act(async () => {
            root.render(<PersonAvatar seed="37b5d34c-d7cc-4f02-9f98-41deef664c35" />)
        })

        expect(container.querySelector('[data-person-avatar-style="monster"]')).not.toBeNull()
        expect(container.querySelector('[data-avatar-renderer="monster"]')).not.toBeNull()
        await act(async () => root.unmount())
    })

    it('renders the same seed with neutral geometry when that user prefers it', async () => {
        mocks.style = 'geometric'
        const container = document.createElement('div')
        const root = createRoot(container)
        await act(async () => {
            root.render(<PersonAvatar seed="37b5d34c-d7cc-4f02-9f98-41deef664c35" />)
        })

        expect(container.querySelector('[data-person-avatar-style="geometric"]')).not.toBeNull()
        expect(container.querySelector('[data-avatar-renderer="geometric"]')).not.toBeNull()
        await act(async () => root.unmount())
    })
})
