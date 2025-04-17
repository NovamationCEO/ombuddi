import { ArrowBack } from '@mui/icons-material'
import { Box } from '@mui/system'
import { useStyles } from '../tools/useStyles'
import { zIndex } from '../constants/zIndex'

export function PullTab(props: { invert?: boolean; sidebarOpen: boolean; setSidebarOpen: (b: boolean) => void }) {
    const { invert, sidebarOpen, setSidebarOpen } = props
    const style = useStyles()

    function toggleOpen() {
        setSidebarOpen(!sidebarOpen)
    }

    const myPosition = invert ? { left: -13 } : { right: 3 }
    const transform = 0 + (invert ? 180 : 0)

    return (
        <Box
            position={'absolute'}
            {...myPosition}
            top={'50%'}
            width={25}
            height={25}
            borderRadius={'50%'}
            bgcolor={style.sidebar.bgcolor}
            display={'flex'}
            justifyContent={'center'}
            alignItems={'center'}
            onClick={toggleOpen}
            sx={{
                cursor: 'pointer',
                transform: sidebarOpen ? `rotate(${transform}deg)` : `rotate(${transform - 360}deg)`,
                transition: '0.3s ease all',
            }}
            zIndex={zIndex.header}
        >
            <ArrowBack
                fontSize={'small'}
                sx={{
                    transform: sidebarOpen ? `rotate(0deg)` : `rotate(180deg)`,
                    transition: '0.4s ease all',
                }}
            />
        </Box>
    )
}
