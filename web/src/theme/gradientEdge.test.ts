import { describe, expect, it } from 'vitest'
import { gradientEdge } from './gradientEdge'

const CASE_WORK = ['/cases', '/case/abc', '/case/abc/add_entry', '/case/abc/entry/1/edit']
const ALL_ROUTES = [
    '/',
    '/add_case',
    '/add_person',
    '/report',
    '/profile',
    '/organization',
    '/admin/users',
    '/system/orgs',
    ...CASE_WORK,
]

describe('workspace gradient edge', () => {
    it('holds the background still across case work', () => {
        const edges = new Set(CASE_WORK.map(gradientEdge))
        expect(edges.size).toBe(1)
    })

    it('keeps every move small', () => {
        const edges = ALL_ROUTES.map(gradientEdge)
        expect(Math.max(...edges) - Math.min(...edges)).toBeLessThanOrEqual(12)
    })

    it('falls back to the default for unmapped routes', () => {
        expect(gradientEdge('/somewhere-new')).toBe(gradientEdge('/'))
    })
})
