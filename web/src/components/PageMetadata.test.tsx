// @vitest-environment jsdom

import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { PageMetadata } from './PageMetadata'


describe('PageMetadata', () => {
    let container: HTMLDivElement
    let root: Root

    beforeEach(() => {
        container = document.createElement('div')
        document.body.appendChild(container)
        root = createRoot(container)
        document.head.querySelector('link[rel="canonical"]')?.remove()
    })

    afterEach(async () => {
        await act(async () => root.unmount())
        container.remove()
    })

    it('sets a descriptive title while keeping signed-in pages out of search results', async () => {
        await act(async () => {
            root.render(<PageMetadata title="New Case" description="Create a protected case." />)
        })

        expect(document.title).toBe('New Case | Ombuddi')
        expect(document.head.querySelector('meta[name="description"]')?.getAttribute('content'))
            .toBe('Create a protected case.')
        expect(document.head.querySelector('meta[name="robots"]')?.getAttribute('content'))
            .toBe('noindex, nofollow')
        expect(document.head.querySelector('link[rel="canonical"]')).toBeNull()
    })

    it('makes the public welcome page indexable with a canonical URL', async () => {
        await act(async () => {
            root.render(
                <PageMetadata
                    title="Confidential Case Management for Ombuds"
                    indexable
                    canonicalPath="/welcome"
                />,
            )
        })

        expect(document.title).toBe('Confidential Case Management for Ombuds | Ombuddi')
        expect(document.head.querySelector('meta[name="robots"]')?.getAttribute('content'))
            .toBe('index, follow')
        expect(document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]')?.href)
            .toBe(`${window.location.origin}/welcome`)
    })
})
