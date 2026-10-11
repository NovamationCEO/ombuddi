// @vitest-environment jsdom
import React, { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { CaseLabelRow } from './CaseLabelRow'
;(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true
let root: Root, container: HTMLDivElement, width: number, resize: () => void
beforeEach(() => {
    width = 310
    vi.spyOn(HTMLElement.prototype, 'clientWidth', 'get').mockImplementation(() => width)
    vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockImplementation(function (this: HTMLElement) {
        return { width: this.hasAttribute('data-more-size') ? 20 : Number(this.textContent), height: 20 } as DOMRect
    })
    vi.stubGlobal(
        'ResizeObserver',
        class {
            constructor(callback: () => void) {
                resize = callback
            }
            observe() {}
            disconnect() {}
        },
    )
    container = document.createElement('div')
    document.body.append(container)
    root = createRoot(container)
})
afterEach(async () => {
    await act(async () => root.unmount())
    container.remove()
    vi.restoreAllMocks()
    vi.unstubAllGlobals()
})
async function render(widths = [70, 70, 70, 70]) {
    await act(async () =>
        root.render(
            <CaseLabelRow
                kind="codes"
                items={widths.map((value, i) => ({ id: String(i), content: <span>{value}</span> }))}
            />,
        ),
    )
}
const visibleItems = () => container.querySelectorAll('.case-label-row > .case-label-item')
it('uses available space for more than two labels and recalculates after resizing', async () => {
    await render()
    expect(visibleItems()).toHaveLength(4)
    expect(container.querySelector('[aria-label$="more codes"]')).toBeNull()
    width = 180
    await act(async () => resize())
    expect(visibleItems()).toHaveLength(2)
    expect(container.querySelector('[aria-label="2 more codes"]')).not.toBeNull()
    width = 310
    await act(async () => resize())
    expect(visibleItems()).toHaveLength(4)
})
it('keeps a preview of an oversized first label while reserving the overflow count', async () => {
    width = 160
    await render([300, 70])
    expect(visibleItems()).toHaveLength(1)
    expect((visibleItems()[0] as HTMLElement).style.maxWidth).toBe('134px')
    expect(container.querySelector('[aria-label="1 more codes"]')).not.toBeNull()
})
it('remeasures changed labels even when the item count stays the same', async () => {
    await render([50, 50, 50])
    expect(visibleItems()).toHaveLength(3)
    await render([150, 150, 150])
    expect(visibleItems()).toHaveLength(1)
    expect(container.querySelector('[aria-label="2 more codes"]')).not.toBeNull()
})
