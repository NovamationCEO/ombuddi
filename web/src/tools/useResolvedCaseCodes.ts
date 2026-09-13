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
            return {
                id,
                shortName: code?.code ?? 'Code',
                description: code?.description ?? 'Code details loading…',
            }
        })
    }, [codeIds, customCodesRes.data])
}
