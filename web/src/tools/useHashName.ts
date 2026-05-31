import { sha256 } from 'js-sha256'
import { useOrganization } from './useOrganization'
import React from 'react'

/**
 * Client-side first hash pass for a visitor name.
 * Result is sent to the server, which mixes in NAME_SALT and re-hashes
 * before comparing or storing (see service/src/hash_name.py).
 *
 * The organization is identified by its UUID — never its name — so an
 * org-name edit cannot orphan existing person rows.
 */
export function useHashName(name: string, salt?: string): string | undefined {
    const organization = useOrganization()
    const orgId = organization?.id

    const res = React.useMemo(() => {
        const combined = `${name}${salt || ''}${orgId || ''}`
        const normalized = combined.trim().toLowerCase().normalize('NFC')
        return sha256(normalized)
    }, [name, salt, orgId])

    if (!orgId || !orgId.length) {
        return undefined
    }

    return res
}
