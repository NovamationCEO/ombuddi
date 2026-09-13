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
        await new Promise((resolve) => setTimeout(resolve, 250))
    })
}

function setInputValue(input: HTMLInputElement | null, value: string) {
    const setValue = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set
    setValue?.call(input, value)
    input?.dispatchEvent(new Event('input', { bubbles: true }))
}

function buttonWithText(text: string) {
    return [...document.body.querySelectorAll('button')].find((button) => button.textContent === text)
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
                <ThemeProvider
                    theme={appTheme}
                    defaultMode="dark"
                >
                    <ProtectedText
                        stored={first}
                        organizationId={organizationId}
                    />
                    <ProtectedText
                        stored={second}
                        organizationId={organizationId}
                    />
                </ThemeProvider>,
            )
        })
        await settleEncryption()

        expect(container.textContent).toContain('First decrypted message')
        expect(container.textContent).not.toContain('Second decrypted message')

        const unlockButton = container.querySelector<HTMLButtonElement>('button[aria-label="Unlock protected text"]')
        expect(unlockButton).not.toBeNull()
        await act(async () => unlockButton?.dispatchEvent(new MouseEvent('click', { bubbles: true })))

        const defaultInput = document.body.querySelector<HTMLInputElement>('input[aria-label="New session default"]')
        expect(defaultInput).not.toBeNull()
        expect(defaultInput?.value).toBe('')
        expect(document.body.textContent).not.toContain('first phrase')
        await act(async () => {
            setInputValue(defaultInput, 'second phrase')
        })
        const saveButton = buttonWithText('Save and try')
        expect(saveButton).toBeDefined()
        await act(async () => saveButton?.dispatchEvent(new MouseEvent('click', { bubbles: true })))
        await settleEncryption()

        expect(useSessionSalt.getState().sessionSalt).toBe('second phrase')
        expect(container.textContent).toContain('First decrypted message')
        expect(container.textContent).toContain('Second decrypted message')
    })

    it('keeps legacy plaintext readable without asking for a phrase', async () => {
        await act(async () => {
            root.render(
                <ThemeProvider
                    theme={appTheme}
                    defaultMode="dark"
                >
                    <ProtectedText
                        stored="Existing plaintext description"
                        organizationId="organization-1"
                    />
                </ThemeProvider>,
            )
        })

        expect(container.textContent).toContain('Existing plaintext description')
        expect(container.textContent).not.toContain('Default Salt')
    })

    it('silently preserves access to legacy text saved with a blank phrase', async () => {
        const organizationId = 'organization-1'
        const stored = await encryptNotes('Blank phrase message', '', organizationId)

        await act(async () => {
            root.render(
                <ThemeProvider
                    theme={appTheme}
                    defaultMode="dark"
                >
                    <ProtectedText
                        stored={stored}
                        organizationId={organizationId}
                    />
                </ThemeProvider>,
            )
        })
        await settleEncryption()

        expect(container.textContent).toContain('Blank phrase message')
        expect(buttonWithText('Blank')).toBeUndefined()
    })

    it('uses a one-time phrase without changing the session default', async () => {
        const organizationId = 'organization-1'
        const stored = await encryptNotes('One-time message', 'item phrase', organizationId)
        useSessionSalt.getState().setSessionSalt('wrong session phrase')

        await act(async () => {
            root.render(
                <ThemeProvider
                    theme={appTheme}
                    defaultMode="dark"
                >
                    <ProtectedText
                        stored={stored}
                        organizationId={organizationId}
                    />
                </ThemeProvider>,
            )
        })
        await settleEncryption()

        const unlockButton = container.querySelector<HTMLButtonElement>('button[aria-label="Unlock protected text"]')
        expect(unlockButton).not.toBeNull()
        expect(container.textContent).not.toContain('One-time message')
        await act(async () => unlockButton?.dispatchEvent(new MouseEvent('click', { bubbles: true })))

        expect(buttonWithText('Blank')).toBeUndefined()
        expect(buttonWithText('Default Salt')).toBeUndefined()
        const recoveryInputs = [...document.body.querySelectorAll('input')]
        expect(recoveryInputs).toHaveLength(2)
        for (const input of recoveryInputs) {
            expect(input.hasAttribute('data-1p-ignore')).toBe(true)
            expect(input.hasAttribute('data-op-ignore')).toBe(true)
            expect(input.autocomplete).toBe('off')
        }
        const oneTimeInput = document.body.querySelector<HTMLInputElement>('input[aria-label="One-time phrase"]')
        await act(async () => setInputValue(oneTimeInput, 'item phrase'))
        const tryButton = buttonWithText('Try phrase')
        expect(tryButton).toBeDefined()
        await act(async () => tryButton?.dispatchEvent(new MouseEvent('click', { bubbles: true })))
        await settleEncryption()

        expect(container.textContent).toContain('One-time message')
        expect(useSessionSalt.getState().sessionSalt).toBe('wrong session phrase')
    })
})
