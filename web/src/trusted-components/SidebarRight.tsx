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
            position={'relative'}
            sx={{ transition: '0.3s ease all' }}
            mr={sidebarOpen ? style.sidebar.margin : offscreen}
            width={`${sidebarRightWidth + 30}px`}
        >
            <Box
                {...style.sidebar}
                width={sidebarRightWidth}
                right={0}
                mr={sidebarOpen ? style.sidebar.margin : offscreen}
            >
                <PullTab
                    invert
                    sidebarOpen={sidebarOpen}
                    setSidebarOpen={setSidebarOpen}
                />
                <Box padding={1}>{children}</Box>
            </Box>
        </Box>
    )
}
