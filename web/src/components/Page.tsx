import { useStyles } from '../tools/useStyles'
import type { ReactNode } from 'react'

import {
    Box,
    CircularProgress,
} from '@mui/material'
import { useAuth0 } from '@auth0/auth0-react'
import { Navigate } from 'react-router-dom'
import { AppRail } from './AppRail'
import { institutionalPalette as palette } from '../theme/institutionalPalette'

export function Page(props: { element: ReactNode; fullBleed?: boolean }) {
    const style = useStyles()
    const { isLoading, isAuthenticated } = useAuth0()

    if (isLoading) {
        return (
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh' }}>
                <CircularProgress />
            </Box>
        )
    }

    if (!isAuthenticated) {
        return (
            <Navigate
                to="/welcome"
                replace
            />
        )
    }

    return (
        <Box
            sx={{
                width: '100vw',
                height: '100vh',
                position: 'relative',
                display: 'flex',
                flexDirection: { xs: 'column', md: 'row' },
                color: style.contrast,
                bgcolor: palette.backgroundDeep,
            }}
        >
            <AppRail />
            <Box
                sx={{
                    flex: 1,
                    minWidth: 0,
                    minHeight: 0,
                    position: 'relative',
                    display: 'flex',
                    order: { xs: 1, md: 0 },
                }}
            >
                <Box
                    sx={{
                        flex: 1,
                        display: 'flex',
                        flexDirection: 'column',
                        minWidth: 0,
                    }}
                >
                    <Box
                        {...(!props.fullBleed ? style.mainContainer : {})}
                        sx={{
                            flex: 1,
                            minWidth: 0,
                            boxSizing: 'border-box',
                            overflow: 'auto',
                        }}
                    >
                        {props.element}
                    </Box>
                </Box>
            </Box>

        </Box>
    )
}
