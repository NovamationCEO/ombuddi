// @vitest-environment jsdom

import { act } from 'react'
import { createRoot } from 'react-dom/client'
import { describe, expect, it } from 'vitest'
import { CaseSceneThumbnail } from './CaseSceneThumbnail'
import { getCaseSceneDescriptor } from './caseScene'
;(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true

describe('CaseSceneThumbnail', () => {
    it('is stable for the same case identifier', () => {
        expect(getCaseSceneDescriptor('case-a')).toEqual(getCaseSceneDescriptor('case-a'))
    })

    it('uses several independent visual features to distinguish cases', () => {
        const descriptors = Array.from({ length: 128 }, (_, index) =>
            JSON.stringify(getCaseSceneDescriptor(`case-${index}`)),
        )

        expect(new Set(descriptors).size).toBeGreaterThanOrEqual(124)
    })

    it('renders as a local SVG without an external image request', async () => {
        const container = document.createElement('div')
        const root = createRoot(container)
        await act(async () => {
            root.render(
                <CaseSceneThumbnail
                    seed="case-a"
                    label="Visual marker for Case A"
                />,
            )
        })
        const svg = container.querySelector('svg')

        expect(svg?.getAttribute('aria-label')).toBe('Visual marker for Case A')
        expect(svg?.querySelectorAll('path, circle, rect, ellipse').length).toBeGreaterThan(5)
        expect(container.querySelector('img')).toBeNull()

        await act(async () => root.unmount())
    })
})
