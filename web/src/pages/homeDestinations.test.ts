import { describe, expect, it } from 'vitest'
import { destinations } from './homeDestinations'

describe('home destinations', () => {
    it('includes Organization Settings with the planning-board artwork', () => {
        const organizationSettings = destinations.find((destination) => destination.url === '/organization')

        expect(organizationSettings).toMatchObject({
            name: 'Organization Settings',
            action: 'Open settings',
        })
        expect(organizationSettings?.image).toContain('planning-board')
    })
})
