import { useLayoutEffect, useRef } from 'react'
import { useLocation, useNavigationType } from 'react-router-dom'

const RESTORE_TIMEOUT_MS = 5000
const RETRY_INTERVAL_MS = 50
const SCROLL_KEYS = new Set(['ArrowUp', 'ArrowDown', 'PageUp', 'PageDown', 'Home', 'End', ' '])

// Positions belong to history entries, not URLs. Capture them as scrolling
// happens: reading scrollTop during route cleanup is too late for shorter pages.
export function useWorkspaceScroll(enabled: boolean) {
    const location = useLocation()
    const navigationType = useNavigationType()
    const scroller = useRef<HTMLDivElement>(null)
    const offsets = useRef(new Map<string, number>())
    const previous = useRef<{ key: string; pathname: string } | null>(null)

    useLayoutEffect(() => {
        const node = scroller.current
        if (!enabled || !node) return
        const { key, pathname } = location
        const last = previous.current
        // Query-only changes (such as organization tabs) keep their position.
        // POP always uses the destination entry's own saved position.
        const target =
            navigationType === 'POP'
                ? (offsets.current.get(key) ?? 0)
                : last?.pathname === pathname
                  ? (offsets.current.get(last.key) ?? 0)
                  : 0
        previous.current = { key, pathname }
        offsets.current.set(key, target)
        let restoring = true
        let timer: ReturnType<typeof setTimeout> | undefined
        const deadline = Date.now() + RESTORE_TIMEOUT_MS

        function remember() {
            if (!restoring) offsets.current.set(key, node!.scrollTop)
        }
        function stop() {
            restoring = false
            clearTimeout(timer)
            remember()
        }
        function onKey(event: KeyboardEvent) {
            const target = event.target
            if (target instanceof Element && target.closest('input, textarea, select, [contenteditable="true"]')) return
            if (SCROLL_KEYS.has(event.key)) stop()
        }
        function restore() {
            // Force an immediate scroll even if global CSS enables smooth scroll.
            node!.scrollTo?.({ top: target, left: 0, behavior: 'instant' })
            if (Math.abs(node!.scrollTop - target) <= 1 || Date.now() >= deadline) {
                stop()
            } else {
                // Suspense, API results, and images may grow the page later.
                timer = setTimeout(restore, RETRY_INTERVAL_MS)
            }
        }
        node.addEventListener('scroll', remember, { passive: true })
        node.addEventListener('wheel', stop, { passive: true })
        node.addEventListener('touchstart', stop, { passive: true })
        node.addEventListener('pointerdown', stop, { passive: true })
        node.addEventListener('keydown', onKey)
        restore()
        return () => {
            clearTimeout(timer)
            node.removeEventListener('scroll', remember)
            node.removeEventListener('wheel', stop)
            node.removeEventListener('touchstart', stop)
            node.removeEventListener('pointerdown', stop)
            node.removeEventListener('keydown', onKey)
        }
    }, [location.key, location.pathname, navigationType, enabled])

    return scroller
}
