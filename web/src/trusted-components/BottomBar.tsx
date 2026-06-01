import { Box } from '@mui/system'
import { sidebarBottomHeight, sidebarLeftWidth, sidebarRightWidth } from '../constants/uiSizes'
import { useLayoutStore } from '../libraries/useLayoutStore'
import { useStyles } from '../tools/useStyles'
import React from 'react'
import { ArrowUpward } from '@mui/icons-material'

export function BottomBar(props: { children?: React.ReactNode }) {
    const { children } = props
    const style = useStyles()

    const leftOpen = useLayoutStore((state) => state.sidebarLeftOpen)
    const rightOpen = useLayoutStore((state) => state.sidebarRightOpen)
    const offscreen = `${sidebarBottomHeight * -1 + 10}px`
    const sidebarOpen = useLayoutStore((state) => state.sidebarBottomOpen)
    const setSidebarOpen = useLayoutStore((state) => state.setSidebarBottomOpen)

    return (
        <Box
            sx={{
                position: 'relative',
                height: sidebarBottomHeight,
                marginBottom: sidebarOpen ? 0 : `${sidebarBottomHeight * -1}px`,
                marginTop: 2,
                transition: '0.3s ease all'
            }}>
            <Box
                {...style.bottomBar}
                sx={{
                    position: 'fixed',
                    bottom: 0,
                    left: leftOpen ? sidebarLeftWidth + 20 : 20,
                    right: rightOpen ? sidebarRightWidth + 20 : 20,
                    mb: sidebarOpen ? style.sidebar.margin : offscreen,
                    height: sidebarBottomHeight
                }}>
                <Box
                    onClick={() => setSidebarOpen(!sidebarOpen)}
                    sx={{
                        position: 'absolute',
                        left: '50%',
                        top: -15,
                        bgcolor: style.sidebar.bgcolor,
                        borderRadius: '50%',
                        width: '25px',
                        height: '25px',
                        display: 'flex',
                        justifyContent: 'center',
                        alignItems: 'center',
                        transition: '0.5s ease all',
                        rotate: sidebarOpen ? '0deg' : '360deg'
                    }}>
                    <ArrowUpward sx={{ transition: '0.3s ease all', rotate: sidebarOpen ? '180deg' : '0deg' }} />
                </Box>
                <Box sx={{
                    padding: 1
                }}>{children}</Box>
            </Box>
        </Box>
    );
}
