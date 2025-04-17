import { Box } from '@mui/system'
import { useStyles } from '../tools/useStyles'

export function Background() {
    const style = useStyles()
    return (
        <Box
            position={'fixed'}
            left={0}
            top={0}
            overflow={'hidden'}
            width={'100%'}
            height={'100%'}
            zIndex={-100}
            sx={{
                backgroundImage: `radial-gradient(circle at top left, 
            ${style.background.start}, ${style.background.end} 50%)`,
            }}
        />
    )
}
