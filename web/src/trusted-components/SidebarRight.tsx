import { Box } from '@mui/system'
import { useStyles } from '../tools/useStyles'
import { useLayoutStore } from '../libraries/useLayoutStore'
import { PullTab } from './PullTab'
import React from 'react'
import { sidebarRightWidth } from '../constants/uiSizes'

export function SidebarRight(props: { children?: React.ReactNode }) {
    const { children } = props
    const style = useStyles()
    const sidebarOpen = useLayoutStore((state) => state.sidebarRightOpen)
    const setSidebarOpen = useLayoutStore((state) => state.setSidebarRightOpen)

    const offscreen = `${sidebarRightWidth * -1}px`

    return (
        <Box
            sx={{
                position: 'relative',
                mr: sidebarOpen ? style.sidebar.margin : offscreen,
                width: `${sidebarRightWidth + 30}px`,
                transition: '0.3s ease all'
            }}>
            <Box
                {...style.sidebar}
                sx={{
                    width: sidebarRightWidth,
                    right: 0,
                    mr: sidebarOpen ? style.sidebar.margin : offscreen
                }}>
                <PullTab
                    invert
                    sidebarOpen={sidebarOpen}
                    setSidebarOpen={setSidebarOpen}
                />
                <Box sx={{
                    padding: 1
                }}>{children}</Box>
            </Box>
        </Box>
    );
}
