import { useGetter } from './db_tools/useGetter'
import { ioaCodeCategories, ioaCodesFull } from '../constants/ioaConstants'
import { CodeCategoryType, CodeType, OrganizationType } from '../types/majorTypes'

/**
 * A "code source" is either:
 *   - an organization (codes + categories come from the API), or
 *   - IOA (codes + categories come from web/src/constants/ioaConstants.ts).
 *
 * Components that show a code picker (CodeSetterBox, OrgCodeSetter) accept
 * a CodeSource and call useCodeSource() to get a uniform shape, so they
 * don't have to branch internally on "where do my codes come from".
 *
 * IOA reference data is application-level, not a fake organization;
 * see docs/CONTEXT.md "Settled decisions" for the why.
 */
export type CodeSource = { kind: 'org'; organizationId: string | undefined } | { kind: 'ioa' }

export type CodeSourceResult = {
    title: string
    codes: CodeType[]
    codeCategories: CodeCategoryType[]
    isReady: boolean
}

export function useCodeSource(source: CodeSource): CodeSourceResult {
    // Hooks must run unconditionally on every render — call all branches,
    // then return based on `source.kind`. When `source.kind === 'ioa'`, the
    // org-side queries are disabled because `organizationId` is undefined
    // (useGetter skips when any key segment is falsy).
    const orgId = source.kind === 'org' ? source.organizationId : undefined
    const orgRes = useGetter<OrganizationType>(['get_organization_by_id', orgId])
    const codesRes = useGetter<CodeType[]>(['get_codes_by_organization_id', orgId])
    const categoriesRes = useGetter<CodeCategoryType[]>([
        'get_code_categories_by_organization_id',
        orgId,
    ])

    if (source.kind === 'ioa') {
        return {
            title: 'IOA Codes',
            codes: ioaCodesFull,
            codeCategories: ioaCodeCategories,
            isReady: true,
        }
    }

    return {
        title: orgRes.data?.name ? `${orgRes.data.name} Codes` : 'Codes',
        codes: codesRes.data ?? [],
        codeCategories: categoriesRes.data ?? [],
        isReady: !!(orgRes.data && codesRes.data && categoriesRes.data),
    }
}
