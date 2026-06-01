import { Box } from '@mui/system'
import { useStyles } from '../tools/useStyles'
import { useLayoutStore } from '../libraries/useLayoutStore'
import { PullTab } from './PullTab'
import React from 'react'
import { headerHeight, sidebarLeftWidth } from '../constants/uiSizes'

export function SidebarLeft(props: { children?: React.ReactNode }) {
    const { children } = props
    const style = useStyles()
    const sidebarOpen = useLayoutStore((state) => state.sidebarLeftOpen)
    const setSidebarOpen = useLayoutStore((state) => state.setSidebarLeftOpen)

    const offscreen = `${sidebarLeftWidth * -1}px`

    return (
        <Box
            sx={{
                position: 'relative',
                ml: sidebarOpen ? style.sidebar.margin : offscreen,
                width: `${sidebarLeftWidth + 30}px`,
                maxHeight: '100vh',
                transition: '0.3s ease all'
            }}>
            <Box sx={{
                height: headerHeight
            }} />
            <Box
                {...style.sidebar}
                sx={{
                    width: `${sidebarLeftWidth}px`,
                    left: 0,
                    ml: sidebarOpen ? style.sidebar.margin : offscreen,
                    flex: 1,
                    display: 'flex',
                    flexDirection: 'column',
                    ...style.sidebar.sx,
                    overflowY: 'scroll',
                    overflowX: 'clip',
                    transform: 'scaleX(-1)'
                }}>
                <Box
                    sx={{
                        padding: 1,
                        display: 'flex',
                        flexDirection: 'column',
                        flex: 1,
                        transform: 'scaleX(-1)'
                    }}>
                    {children}
                </Box>
            </Box>
            <PullTab
                sidebarOpen={sidebarOpen}
                setSidebarOpen={setSidebarOpen}
            />
        </Box>
    );
}
