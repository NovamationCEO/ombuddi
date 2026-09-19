import { Box } from '@mui/material'
import { useLocation } from 'react-router-dom'
import { institutionalPalette as palette } from '../theme/institutionalPalette'
import { gradientEdge } from '../theme/gradientEdge'

export function WorkspaceBackground() {
    const { pathname } = useLocation()
    // The gradient layer is three times the workspace width with its edge at the
    // centre, so translating by (edge - 50) / 3 percent of the layer moves the
    // edge to exactly `edge` percent of the workspace.
    const offset = (gradientEdge(pathname) - 50) / 3
    return (
        <Box
            aria-hidden="true"
            sx={{
                position: 'absolute',
                inset: 0,
                overflow: 'hidden',
                pointerEvents: 'none',
                bgcolor: palette.background,
            }}
        >
            <Box
                data-workspace-gradient
                sx={{
                    position: 'absolute',
                    inset: '0 -100%',
                    background: `linear-gradient(122deg, transparent 50%, ${palette.backgroundDeep} 50%)`,
                    transform: `translateX(${offset}%)`,
                    willChange: 'transform',
                    transition: 'transform 350ms ease-out',
                    '@media (prefers-reduced-motion: reduce)': { transition: 'none' },
                }}
            />
        </Box>
    )
}
