import { sha256 } from 'js-sha256'
import { useOrganization } from './useOrganization'
import React from 'react'

export function useHashName(name: string, salt?: string): string | undefined {
    const organization = useOrganization()

    const res = React.useMemo(() => {
        const combined = `${name}${salt || ''}${organization?.name || ''}`
        const normalized = combined.trim().toLowerCase().normalize('NFC')
        return sha256(normalized)
    }, [name, salt, organization?.name])

    if (!organization?.name || !organization?.name?.length) {
        return undefined
    }

    return res
}
