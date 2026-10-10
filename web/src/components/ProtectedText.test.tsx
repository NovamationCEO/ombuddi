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

        await act(async () => useSessionSalt.getState().setSessionSalt('second phrase'))
        await settleEncryption()

        expect(useSessionSalt.getState().sessionSalt).toBe('second phrase')
        expect(container.textContent).toContain('First decrypted message')
        expect(container.textContent).toContain('Second decrypted message')
    })

    it('retries a changed default after an unsuccessful item-specific phrase', async () => {
        const stored = await encryptNotes('Recovered with new default', 'correct default', 'organization-1')
        await act(async () =>
            root.render(
                <ThemeProvider theme={appTheme}>
                    <ProtectedText
                        stored={stored}
                        organizationId="organization-1"
                    />
                </ThemeProvider>,
            ),
        )
        await settleEncryption()
        await act(async () => container.querySelector<HTMLButtonElement>('button')?.click())
        await act(async () => setInputValue(document.body.querySelector('input'), 'incorrect phrase'))
        await act(async () => buttonWithText('Unlock')?.click())
        await settleEncryption()
        expect(container.textContent).not.toContain('Recovered with new default')
        await act(async () => useSessionSalt.getState().setSessionSalt('correct default'))
        await settleEncryption()
        expect(container.textContent).toContain('Recovered with new default')
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

    it.each([undefined, 'Unlock notes'])(
        'uses a one-time phrase without changing the session default (label: %s)',
        async (unlockLabel) => {
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
                            unlockLabel={unlockLabel}
                            organizationId={organizationId}
                        />
                    </ThemeProvider>,
                )
            })
            await settleEncryption()

            const unlockButton = unlockLabel
                ? buttonWithText(unlockLabel)
                : container.querySelector<HTMLButtonElement>('button[aria-label="Unlock protected text"]')
            expect(unlockButton).not.toBeNull()
            expect(container.textContent).not.toContain('One-time message')
            await act(async () => unlockButton?.dispatchEvent(new MouseEvent('click', { bubbles: true })))

            expect(document.body.querySelector('[role="dialog"][aria-label="Protected Text"]')).not.toBeNull()
            expect(document.body.textContent).not.toContain('session default')
            expect(document.body.textContent).toContain('This text is encrypted.')
            expect(buttonWithText('Blank')).toBeUndefined()
            expect(buttonWithText('Default Salt')).toBeUndefined()
            const recoveryInputs = [...document.body.querySelectorAll('input')]
            expect(recoveryInputs).toHaveLength(1)
            for (const input of recoveryInputs) {
                expect(input.hasAttribute('data-1p-ignore')).toBe(true)
                expect(input.hasAttribute('data-op-ignore')).toBe(true)
                expect(input.autocomplete).toBe('off')
            }
            const oneTimeInput = document.body.querySelector<HTMLInputElement>('input[aria-label="Phrase"]')
            expect(oneTimeInput?.type).toBe('password')
            await act(async () => setInputValue(oneTimeInput, 'incorrect phrase'))
            await act(async () => {
                document.body.querySelector<HTMLButtonElement>('button[aria-label="Show phrase"]')?.click()
            })
            expect(oneTimeInput?.type).toBe('text')
            expect(oneTimeInput?.value).toBe('incorrect phrase')
            await act(async () => {
                document.body.querySelector<HTMLButtonElement>('button[aria-label="Hide phrase"]')?.click()
            })
            expect(oneTimeInput?.type).toBe('password')
            expect(oneTimeInput?.value).toBe('incorrect phrase')
            const tryButton = buttonWithText('Unlock')
            expect(tryButton).toBeDefined()
            await act(async () => tryButton?.dispatchEvent(new MouseEvent('click', { bubbles: true })))
            await settleEncryption()

            expect(document.body.querySelector('[role="alert"]')?.textContent).toContain('did not unlock')
            expect(container.textContent).not.toContain('One-time message')
            await act(async () => setInputValue(oneTimeInput, 'item phrase'))
            await act(async () => buttonWithText('Unlock')?.dispatchEvent(new MouseEvent('click', { bubbles: true })))
            await settleEncryption()

            expect(container.textContent).toContain('One-time message')
            expect(useSessionSalt.getState().sessionSalt).toBe('wrong session phrase')
        },
    )
})
