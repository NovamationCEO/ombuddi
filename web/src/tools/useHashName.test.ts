import { describe, expect, it } from 'vitest'
import { hashPersonName } from './useHashName'

describe('hashPersonName', () => {
    it('normalizes trailing name spaces without changing phrase spaces', () => {
        const organizationId = 'organization-1'

        expect(hashPersonName('Jordan Lee   ', 'phrase ', organizationId)).toBe(
            hashPersonName('Jordan Lee', 'phrase ', organizationId),
        )
        expect(hashPersonName('Jordan Lee', 'phrase ', organizationId)).not.toBe(
            hashPersonName('Jordan Lee', 'phrase', organizationId),
        )
    })
})
