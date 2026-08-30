// @vitest-environment jsdom

import React, { act } from 'react'
import { webcrypto } from 'node:crypto'
import { createRoot, type Root } from 'react-dom/client'
import { ThemeProvider } from '@mui/material/styles'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { appTheme } from '../theme/appTheme'
import { encryptNotes } from '../tools/notesCrypto'
import { useSessionSalt } from '../libraries/useSessionSalt'
import { ProtectedText } from './ProtectedText'

;(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true
Object.defineProperty(globalThis, 'crypto', { value: webcrypto, configurable: true })

async function settleEncryption() {
    await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 150))
    })
}

describe('ProtectedText', () => {
    let container: HTMLDivElement
    let root: Root

    beforeEach(() => {
        container = document.createElement('div')
        document.body.appendChild(container)
        root = createRoot(container)
        useSessionSalt.getState().clearSessionSalt()
    })

    afterEach(async () => {
        await act(async () => root.unmount())
        container.remove()
    })

    it('keeps successful plaintext visible and retries only locked default items when the default changes', async () => {
        const organizationId = 'organization-1'
        const first = await encryptNotes('First decrypted message', 'first phrase', organizationId)
        const second = await encryptNotes('Second decrypted message', 'second phrase', organizationId)
        useSessionSalt.getState().setSessionSalt('first phrase')

        await act(async () => {
            root.render(
                <ThemeProvider theme={appTheme} defaultMode="dark">
                    <ProtectedText stored={first} organizationId={organizationId} />
                    <ProtectedText stored={second} organizationId={organizationId} />
                </ThemeProvider>,
            )
        })
        await settleEncryption()

        expect(container.textContent).toContain('First decrypted message')
        expect(container.textContent).not.toContain('Second decrypted message')

        const defaultInput = container.querySelector('input')
        expect(defaultInput).not.toBeNull()
        await act(async () => {
            const setValue = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set
            setValue?.call(defaultInput, 'second phrase')
            defaultInput?.dispatchEvent(new Event('input', { bubbles: true }))
        })
        await settleEncryption()

        expect(useSessionSalt.getState().sessionSalt).toBe('second phrase')
        expect(container.textContent).toContain('First decrypted message')
        expect(container.textContent).toContain('Second decrypted message')
    })

    it('keeps legacy plaintext readable without asking for a phrase', async () => {
        await act(async () => {
            root.render(
                <ThemeProvider theme={appTheme} defaultMode="dark">
                    <ProtectedText stored="Existing plaintext description" organizationId="organization-1" />
                </ThemeProvider>,
            )
        })

        expect(container.textContent).toContain('Existing plaintext description')
        expect(container.textContent).not.toContain('Default Salt')
    })

    it('can explicitly unlock text that was saved with a blank phrase', async () => {
        const organizationId = 'organization-1'
        const stored = await encryptNotes('Blank phrase message', '', organizationId)

        await act(async () => {
            root.render(
                <ThemeProvider theme={appTheme} defaultMode="dark">
                    <ProtectedText stored={stored} organizationId={organizationId} />
                </ThemeProvider>,
            )
        })

        const blankButton = [...container.querySelectorAll('button')]
            .find((button) => button.textContent === 'Blank')
        expect(blankButton).toBeDefined()
        await act(async () => blankButton?.dispatchEvent(new MouseEvent('click', { bubbles: true })))
        await settleEncryption()

        expect(container.textContent).toContain('Blank phrase message')
    })
})
