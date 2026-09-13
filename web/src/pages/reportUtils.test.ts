import { describe, expect, it } from 'vitest'
import { normalizeMinCellSize, reportRequestPath, suppressSmallBuckets } from './reportUtils'

describe('normalizeMinCellSize', () => {
    it('enforces a whole-number minimum of one', () => {
        expect(normalizeMinCellSize(0)).toBe(1)
        expect(normalizeMinCellSize(-10)).toBe(1)
        expect(normalizeMinCellSize(3.9)).toBe(3)
        expect(normalizeMinCellSize('not-a-number')).toBe(1)
    })
})

describe('reportRequestPath', () => {
    it('includes the selected reporting scope', () => {
        expect(reportRequestPath('2026-01-01', '2026-12-31', 'my')).toBe(
            'reports?start=2026-01-01&end=2026-12-31&scope=my',
        )
        expect(reportRequestPath('2026-01-01', '2026-12-31', 'organization')).toContain('scope=organization')
    })
})

describe('suppressSmallBuckets', () => {
    it('merges small buckets into Other without changing qualifying buckets', () => {
        expect(suppressSmallBuckets(['Large', 'Small A', 'Small B'], [8, 2, 1], 5)).toEqual({
            categories: ['Large', 'Other'],
            data: [8, 3],
        })
    })

    it('adds suppressed values to an existing Other bucket', () => {
        expect(suppressSmallBuckets(['Other', 'Small'], [7, 2], 5)).toEqual({
            categories: ['Other'],
            data: [9],
        })
    })

    it('treats missing values as zero instead of producing NaN', () => {
        expect(suppressSmallBuckets(['Present', 'Missing'], [4], 1)).toEqual({
            categories: ['Present'],
            data: [4],
        })
    })
})
