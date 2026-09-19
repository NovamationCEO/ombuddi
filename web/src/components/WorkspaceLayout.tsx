import { useStyles } from '../tools/useStyles'
import { Suspense, useEffect, useRef } from 'react'
import { WorkspaceBackground } from './WorkspaceBackground'

import { Box, CircularProgress } from '@mui/material'
import { useAuth0 } from '@auth0/auth0-react'
import { Navigate, Outlet, useLocation, useNavigationType } from 'react-router-dom'
import { AppRail } from './AppRail'
import { institutionalPalette as palette } from '../theme/institutionalPalette'

export function WorkspaceLayout() {
    const { key } = useLocation()
    const navigationType = useNavigationType()
    const scroller = useRef<HTMLDivElement>(null)
    const offsets = useRef(new Map<string, number>())
    // The workspace scrolls in its own container, so router scroll restoration
    // does not apply. Going Back returns to where the page was left; anything
    // else opens at the top. A page still loading its content restores to the
    // top, because there is nothing to scroll yet.
    useEffect(() => {
        const node = scroller.current
        if (!node) return
        const saved = navigationType === 'POP' ? offsets.current.get(key) : undefined
        node.scrollTo?.({ top: saved ?? 0, left: 0 })
        return () => {
            offsets.current.set(key, node.scrollTop)
        }
    }, [key, navigationType])
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
                    isolation: 'isolate',
                }}
            >
                <WorkspaceBackground />
                <Box
                    sx={{
                        position: 'relative',
                        flex: 1,
                        display: 'flex',
                        flexDirection: 'column',
                        minWidth: 0,
                    }}
                >
                    <Box
                        ref={scroller}
                        sx={{
                            flex: 1,
                            minWidth: 0,
                            boxSizing: 'border-box',
                            overflow: 'auto',
                        }}
                    >
                        <Suspense
                            fallback={
                                <Box
                                    role="status"
                                    aria-label="Loading page"
                                    sx={{ p: 4 }}
                                >
                                    <CircularProgress />
                                </Box>
                            }
                        >
                            <Outlet />
                        </Suspense>
                    </Box>
                </Box>
            </Box>
        </Box>
    )
}
