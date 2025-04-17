import { Box } from '@mui/system'
import { useStyles } from '../tools/useStyles'
import { Header } from './Header'

import { headerHeight } from '../constants/uiSizes'

export function PageAlternate(props: { element: JSX.Element }) {
    const { element } = props
    const style = useStyles()

    return (
        <Box
            width={'100vw'}
            height={'100vh'}
            position={'relative'}
            display={'flex'}
            flexDirection={'column'}
            color={style.contrast}
        >
            <Header />
            <Box
                height={`calc(100% - ${headerHeight}px)`}
                flex={1}
                position={'relative'}
                display={'flex'}
            >
                <Box
                    flex={1}
                    display={'flex'}
                    flexDirection={'column'}
                >
                    <Box
                        flex={1}
                        {...style.mainContainer}
                        marginTop={`${headerHeight + 20}px`}
                        overflow={'auto'}
                    >
                        {element}
                    </Box>
                </Box>
            </Box>
        </Box>
    )
}
