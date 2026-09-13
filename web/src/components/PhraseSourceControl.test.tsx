// @vitest-environment jsdom

import { act } from 'react'
import { createRoot } from 'react-dom/client'
import { afterEach, describe, expect, it } from 'vitest'
import { useSessionSalt } from '../libraries/useSessionSalt'
import { PhraseSourceControl } from './PhraseSourceControl'

;(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true

describe('PhraseSourceControl', () => {
    afterEach(() => {
        useSessionSalt.getState().clearSessionSalt()
        document.body.replaceChildren()
    })

    it('never renders an established session default into the document', async () => {
        useSessionSalt.getState().setSessionSalt('confidential semester phrase')
        const container = document.createElement('div')
        document.body.append(container)
        const root = createRoot(container)

        await act(async () => root.render(
            <PhraseSourceControl
                source="default"
                onSourceChange={() => undefined}
                customPhrase=""
                onCustomPhraseChange={() => undefined}
                purpose="encrypt"
            />,
        ))

        expect(container.textContent).toContain('Using session default')
        expect(container.textContent).not.toContain('confidential semester phrase')
        expect(container.querySelector('input')).toBeNull()

        await act(async () => {
            const replaceButton = [...container.querySelectorAll('button')]
                .find((button) => button.textContent === 'Replace session default')
            replaceButton?.click()
        })

        const replacement = container.querySelector<HTMLInputElement>('input')
        expect(replacement?.type).toBe('text')
        expect(replacement?.value).toBe('')
        await act(async () => root.unmount())
    })
})
