// @vitest-environment jsdom

import { act } from 'react'
import { createRoot } from 'react-dom/client'
import { Box, Chip } from '@mui/material'
import { afterEach, describe, expect, it } from 'vitest'
import { CaseCodeTooltip } from './CaseCodeTooltip'
;(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true

const codes = [
    { id: 'code-1', shortName: 'A1', description: 'First explanation' },
    { id: 'code-2', shortName: 'B2', description: 'Second explanation' },
]

describe('CaseCodeTooltip', () => {
    afterEach(() => document.body.replaceChildren())

    it('shows every assigned code explanation when any code is hovered', async () => {
        const container = document.createElement('div')
        document.body.append(container)
        const root = createRoot(container)
        await act(async () =>
            root.render(
                <CaseCodeTooltip codes={codes}>
                    <Box>
                        {codes.map((code) => <Chip key={code.id} label={code.shortName} />)}
                    </Box>
                </CaseCodeTooltip>,
            ),
        )

        const firstChip = container.querySelector('.MuiChip-root')
        await act(async () => {
            firstChip?.dispatchEvent(new MouseEvent('mouseover', { bubbles: true }))
            await new Promise((resolve) => setTimeout(resolve, 150))
        })

        expect(document.body.textContent).toContain('A1: First explanation')
        expect(document.body.textContent).toContain('B2: Second explanation')

        await act(async () => root.unmount())
    })
})
