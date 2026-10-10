// @vitest-environment jsdom
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { MemoryRouter } from 'react-router-dom'
import { ThemeProvider } from '@mui/material/styles'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { AppRail } from './AppRail'
import { appTheme } from '../theme/appTheme'
import { useSessionSalt } from '../libraries/useSessionSalt'
import { usePhraseSelection } from '../tools/phraseSource'
;(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true
vi.mock('../tools/useCurrentOmbuds', () => ({ useCurrentOmbuds: () => ({ data: {} }) }))
vi.mock('./AccountButton', () => ({ AccountButton: () => <button>Sign out</button> }))
let host: HTMLDivElement
let root: Root
const button = (name: string) =>
    [...document.body.querySelectorAll('button')].find((b) => (b.getAttribute('aria-label') || b.textContent) === name)!
const input = () => document.body.querySelector<HTMLInputElement>('input')!
async function typePhrase(value: string) {
    await act(async () => {
        Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!.call(input(), value)
        input().dispatchEvent(new Event('input', { bubbles: true }))
    })
}
async function click(name: string) {
    await act(async () => button(name).click())
}
function NewProtection() {
    const choice = usePhraseSelection('default', true)
    return (
        <>
            <output>{choice.phrase === null ? 'Needs confirmation' : 'Ready to save'}</output>
            <button onClick={choice.confirmDefault}>Confirm suggestion</button>
        </>
    )
}
beforeEach(async () => {
    useSessionSalt.getState().clearSessionSalt()
    host = document.createElement('div')
    document.body.append(host)
    root = createRoot(host)
    await act(async () =>
        root.render(
            <ThemeProvider theme={appTheme}>
                <MemoryRouter>
                    <AppRail />
                    <NewProtection />
                </MemoryRouter>
            </ThemeProvider>,
        ),
    )
})
afterEach(async () => {
    await act(async () => root.unmount())
    host.remove()
    useSessionSalt.getState().clearSessionSalt()
})
it('opens above sign out, masks the draft, and applies changes only on Save', async () => {
    const buttons = [...host.querySelectorAll('button')]
    expect(buttons.indexOf(button('Default Encryption Phrase'))).toBeLessThan(buttons.indexOf(button('Sign out')))
    await click('Default Encryption Phrase')
    expect(input().type).toBe('password')
    await typePhrase('sample phrase')
    expect(useSessionSalt.getState().sessionSalt).toBeNull()
    await click('Show phrase')
    expect(input().type).toBe('text')
    await click('Cancel')
    expect(useSessionSalt.getState().sessionSalt).toBeNull()
    await click('Default Encryption Phrase')
    expect(input().type).toBe('password')
    expect(input().value).toBe('')
    await typePhrase('sample phrase')
    await click('Save')
    expect(useSessionSalt.getState().sessionSalt).toBe('sample phrase')
    expect(host.querySelector('output')?.textContent).toBe('Needs confirmation')
    await click('Confirm suggestion')
    expect(host.querySelector('output')?.textContent).toBe('Ready to save')
    await click('Default Encryption Phrase')
    await typePhrase('replacement phrase')
    await click('Save')
    expect(host.querySelector('output')?.textContent).toBe('Needs confirmation')
    await click('Default Encryption Phrase')
    await click('Clear')
    expect(useSessionSalt.getState().sessionSalt).toBeNull()
})
