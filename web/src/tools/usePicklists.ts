import React from 'react'
import { useGetter } from './db_tools/useGetter'
import { useOrganization } from './useOrganization'
import { PicklistType } from '../types/majorTypes'

/**
 * Picklists for the current organization, filtered to a single `kind`
 * (e.g. 'medium', 'priority').
 *
 * The underlying request fetches every picklist row for the org regardless
 * of kind; React Query dedupes across hooks, so two components asking for
 * different kinds share one round-trip.
 *
 * Rows come back sorted by `index` so the UI can render them in the order
 * the org admin arranged.
 */
export function usePicklists(kind: string): {
    items: PicklistType[]
    isLoading: boolean
    refetch: () => void
    /** All picklist rows for the org, all kinds — for callers that need to filter elsewhere. */
    allItems: PicklistType[]
} {
    const organization = useOrganization()
    const res = useGetter<PicklistType[]>([
        'get_picklists_by_organization_id',
        organization?.id,
    ])

    const items = React.useMemo<PicklistType[]>(() => {
        const all = res.data ?? []
        return all
            .filter((p) => p.kind === kind)
            .slice()
            .sort((a, b) => a.index - b.index)
    }, [res.data, kind])

    return {
        items,
        isLoading: res.isLoading,
        refetch: () => void res.refetch(),
        allItems: res.data ?? [],
    }
}
