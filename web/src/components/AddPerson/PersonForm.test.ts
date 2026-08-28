import { describe, expect, it } from 'vitest'
import { getPrimaryRoleOptions } from './primaryRoleOptions'

const configuredRoles = [
    { id: 'role-1', organizationId: 'org-1', name: 'Faculty', index: 0, softDelete: false },
    { id: 'role-2', organizationId: 'org-1', name: 'Staff', index: 1, softDelete: false },
]

describe('getPrimaryRoleOptions', () => {
    it('does not expose fallback roles while organization roles are loading', () => {
        expect(getPrimaryRoleOptions([], true)).toEqual([])
        expect(getPrimaryRoleOptions(configuredRoles, true)).toEqual([])
    })

    it('uses organization roles after loading', () => {
        expect(getPrimaryRoleOptions(configuredRoles, false)).toEqual([
            { value: 'unknown', label: 'Unknown' },
            { value: 'Faculty', label: 'Faculty' },
            { value: 'Staff', label: 'Staff' },
        ])
    })
})
