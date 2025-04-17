import { Box } from '@mui/system'
import { sidebarLeftWidth, sidebarRightWidth, useSidebarTop, sidebarTopHeight } from '../constants/uiSizes'
import { useStyles } from '../tools/useStyles'
import { useUpperBar } from '../libraries/useUpperBar'
import { useLayoutStore } from '../libraries/useLayoutStore'

export function SidebarTop() {
    const style = useStyles()
    const position = useUpperBar((state) => state.position)
    const sidebarHeight = sidebarTopHeight[position]
    const content = useUpperBar((state) => state.content)

    const leftOpen = useLayoutStore((state) => state.sidebarLeftOpen)
    const rightOpen = useLayoutStore((state) => state.sidebarRightOpen)

    if (!useSidebarTop) return null

    return (
        <Box
            position={'relative'}
            height={sidebarHeight}
            marginTop={0}
            sx={{ transition: '0.3s ease all' }}
            marginBottom={2}
        >
            <Box
                {...style.topBar}
                position={'fixed'}
                left={leftOpen ? sidebarLeftWidth + 20 : 20}
                right={rightOpen ? sidebarRightWidth + 20 : 20}
                mt={style.sidebar.margin}
                height={sidebarHeight}
                overflow={'hidden'}
            >
                <Box padding={1}>{content}</Box>
            </Box>
        </Box>
    )
}
