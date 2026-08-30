import { describe, expect, it } from 'vitest'
import { adminDestinations, destinations, getVisibleAdminDestinations } from './homeDestinations'

describe('home destinations', () => {
    it('includes Organization Settings with the planning-board artwork', () => {
        const organizationSettings = destinations.find((destination) => destination.url === '/organization')

        expect(organizationSettings).toMatchObject({
            name: 'Organization Settings',
            action: 'Open settings',
        })
        expect(organizationSettings?.image).toContain('planning-board')
    })

    it('gives every Home destination distinct artwork', () => {
        expect(adminDestinations.map((destination) => destination.url)).toEqual(['/admin/users', '/system/orgs'])

        const allDestinations = [...destinations, ...adminDestinations]
        expect(new Set(allDestinations.map((destination) => destination.image)).size).toBe(allDestinations.length)
        expect(adminDestinations[0].image).toContain('admin-users')
        expect(adminDestinations[1].image).toContain('system-admin')
    })

    it('only exposes administration destinations allowed by the current role', () => {
        expect(getVisibleAdminDestinations({ isAdmin: false, isSystemAdmin: false })).toEqual([])
        expect(
            getVisibleAdminDestinations({ isAdmin: true, isSystemAdmin: false }).map((destination) => destination.url),
        ).toEqual(['/admin/users'])
        expect(
            getVisibleAdminDestinations({ isAdmin: false, isSystemAdmin: true }).map((destination) => destination.url),
        ).toEqual(['/system/orgs'])
        expect(
            getVisibleAdminDestinations({ isAdmin: true, isSystemAdmin: true }).map((destination) => destination.url),
        ).toEqual(['/admin/users', '/system/orgs'])
    })
})
