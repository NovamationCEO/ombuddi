// @vitest-environment jsdom
import { act, useCallback, useState } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { MemoryRouter, useLocation, useNavigate } from 'react-router-dom'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { useWorkspaceScroll } from './useWorkspaceScroll'
;(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true
let height = 2000
let top = 0
let host: HTMLDivElement
let root: Root
let delayed = false
let scrollTo: ReturnType<typeof vi.fn>
function Fixture() {
    const location = useLocation()
    const navigate = useNavigate()
    const [enabled, setEnabled] = useState(true)
    const ref = useWorkspaceScroll(enabled)
    // Simulate browser clamping when the destination commits shorter content.
    height = location.pathname === '/short' || delayed ? 100 : 2000
    top = Math.min(top, Math.max(0, height - 100))
    const attach = useCallback(
        (node: HTMLDivElement | null) => {
            ref.current = node
            if (!node) return
            Object.defineProperty(node, 'scrollTop', { configurable: true, get: () => top })
            scrollTo = vi.fn(({ top: value }: { top: number }) => {
                top = Math.min(value, Math.max(0, height - 100))
            })
            Object.defineProperty(node, 'scrollTo', { configurable: true, value: scrollTo })
        },
        [ref],
    )
    return (
        <>
            <button onClick={() => navigate('/short')}>Short</button>
            <button onClick={() => navigate('/long')}>Long</button>
            <button onClick={() => navigate('?tab=details', { replace: true })}>Tab</button>
            <button onClick={() => navigate(-1)}>Back</button>
            <button onClick={() => navigate(1)}>Forward</button>
            <button onClick={() => setEnabled(!enabled)}>Authentication</button>
            {enabled && (
                <div
                    data-scroll
                    ref={attach}
                    tabIndex={0}
                >
                    <input />
                </div>
            )}
        </>
    )
}
async function click(label: string) {
    await act(async () =>
        Array.from(host.querySelectorAll('button'))
            .find((b) => b.textContent === label)!
            .click(),
    )
}
function scroll(value: number) {
    top = value
    host.querySelector('[data-scroll]')!.dispatchEvent(new Event('scroll'))
}
beforeEach(async () => {
    vi.useFakeTimers()
    top = 0
    height = 2000
    delayed = false
    host = document.createElement('div')
    document.body.append(host)
    root = createRoot(host)
    await act(async () =>
        root.render(
            <MemoryRouter initialEntries={['/long']}>
                <Fixture />
            </MemoryRouter>,
        ),
    )
})
afterEach(async () => {
    await act(async () => root.unmount())
    host.remove()
    vi.useRealTimers()
})
it('retains the outgoing offset when a shorter destination clamps the container', async () => {
    scroll(850)
    await click('Short')
    expect(top).toBe(0)
    await click('Back')
    expect(top).toBe(850)
    await click('Forward')
    expect(top).toBe(0)
})
it('waits for delayed content before completing restoration', async () => {
    scroll(850)
    await click('Short')
    delayed = true
    await click('Back')
    expect(top).toBe(0)
    await act(async () => vi.advanceTimersByTime(500))
    height = 2000
    await act(async () => vi.advanceTimersByTime(50))
    expect(top).toBe(850)
    expect(vi.getTimerCount()).toBe(0)
})
it.each(['wheel', 'touchstart', 'pointerdown', 'keydown'])('stops restoring on user %s input', async (type) => {
    scroll(850)
    await click('Short')
    delayed = true
    await click('Back')
    host.querySelector('[data-scroll]')!.dispatchEvent(
        type === 'keydown' ? new KeyboardEvent(type, { key: 'PageDown' }) : new Event(type),
    )
    height = 2000
    scroll(120)
    await act(async () => vi.advanceTimersByTime(6000))
    expect(top).toBe(120)
    expect(vi.getTimerCount()).toBe(0)
})
it('does not treat typing in a form as scrolling intent', async () => {
    scroll(850)
    await click('Short')
    delayed = true
    await click('Back')
    host.querySelector('input')!.dispatchEvent(new KeyboardEvent('keydown', { key: ' ', bubbles: true }))
    height = 2000
    await act(async () => vi.advanceTimersByTime(50))
    expect(top).toBe(850)
})
it('bounds retries when the content never grows', async () => {
    scroll(850)
    await click('Short')
    delayed = true
    await click('Back')
    await act(async () => vi.advanceTimersByTime(5000))
    expect(vi.getTimerCount()).toBe(0)
    const calls = scrollTo.mock.calls.length
    height = 2000
    await act(async () => vi.advanceTimersByTime(5000))
    expect(scrollTo).toHaveBeenCalledTimes(calls)
})
it('keeps query-only tab changes in place and starts new paths at the top', async () => {
    scroll(400)
    await click('Tab')
    expect(top).toBe(400)
    await click('Short')
    await click('Back')
    expect(top).toBe(400)
    await click('Long')
    expect(top).toBe(400)
})
it('cancels pending retries on navigation and when the scroller unmounts', async () => {
    scroll(850)
    await click('Short')
    delayed = true
    await click('Back')
    await click('Short')
    expect(vi.getTimerCount()).toBe(0)
    await click('Back')
    await click('Authentication')
    expect(vi.getTimerCount()).toBe(0)
    delayed = false
    await click('Authentication')
    expect(top).toBe(850)
})
