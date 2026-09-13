import { useMemo } from 'react'
import { ioaCodesFull } from '../constants/ioaConstants'
import type { CodeType } from '../types/majorTypes'
import { useGetter } from './db_tools/useGetter'
import { useOrganization } from './useOrganization'

export type ResolvedCaseCode = {
    id: string
    shortName: string
    description: string
}

export function useResolvedCaseCodes(codeIds: string[]): ResolvedCaseCode[] {
    const organization = useOrganization()
    const customCodesRes = useGetter<CodeType[]>(['get_codes_by_organization_id', organization?.id])

    return useMemo(() => {
        const codeById = new Map([...ioaCodesFull, ...(customCodesRes.data ?? [])].map((code) => [code.id, code]))
        return codeIds.map((id) => {
            const code = codeById.get(id)
            const unresolvedDescription = customCodesRes.isLoading
                ? 'Code details loading…'
                : 'Code details are unavailable. The code may have been removed.'
            return {
                id,
                shortName: code?.code ?? (customCodesRes.isLoading ? 'Code' : 'Unknown code'),
                description: code?.description ?? unresolvedDescription,
            }
        })
    }, [codeIds, customCodesRes.data, customCodesRes.isLoading])
}
