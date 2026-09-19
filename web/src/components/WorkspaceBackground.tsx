import { Box } from '@mui/material'
import { useLocation } from 'react-router-dom'
import { institutionalPalette as palette } from '../theme/institutionalPalette'

export function WorkspaceBackground() {
    const { pathname } = useLocation()
    const position = pathname.startsWith('/case/')
        ? 58
        : pathname === '/cases'
          ? 76
          : pathname === '/add_case'
            ? 66
            : pathname === '/report'
              ? 64
              : pathname === '/profile'
                ? 82
                : pathname === '/organization'
                  ? 62
                  : pathname === '/admin/users'
                    ? 50
                    : pathname === '/system/orgs'
                      ? 70
                      : pathname === '/add_person'
                        ? 60
                        : 71
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
                    transform: `translateX(${(position - 50) / 3}%)`,
                    transition: 'transform 700ms ease-out',
                    '@media (prefers-reduced-motion: reduce)': { transition: 'none' },
                }}
            />
        </Box>
    )
}
