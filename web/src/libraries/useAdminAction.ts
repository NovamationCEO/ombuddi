import React from 'react'
import { useSnack } from './useSnack'

// Serialize administrative mutations and keep failures available at their source.
export function useAdminAction(refresh: () => Promise<unknown>) {
    const pending = React.useRef(false)
    const [busy, setBusy] = React.useState(false)
    const [error, setError] = React.useState<{ message: string; target: string } | null>(null)
    const setSnack = useSnack((state) => state.setSnack)

    async function run(action: () => Promise<unknown>, fallback: string, target: string, refreshAfter = refresh) {
        if (pending.current) return false
        pending.current = true
        setBusy(true)
        setError(null)
        try {
            await action()
            await refreshAfter()
            return true
        } catch (reason) {
            const message = reason instanceof Error ? reason.message : fallback
            setError({ message, target })
            setSnack({ message, severity: 'error' })
            return false
        } finally {
            pending.current = false
            setBusy(false)
        }
    }
    return { run, busy, pending, error, clearError: () => setError(null) }
}
