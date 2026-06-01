import { Box } from '@mui/system'
import { useStyles } from '../tools/useStyles'
import { Header } from './Header'
import type { ReactNode } from 'react'

import { headerHeight } from '../constants/uiSizes'

export function PageAlternate(props: { element: ReactNode }) {
    const { element } = props
    const style = useStyles()

    return (
        <Box
            sx={{
                width: '100vw',
                height: '100vh',
                position: 'relative',
                display: 'flex',
                flexDirection: 'column',
                color: style.contrast
            }}>
            <Header />
            <Box
                sx={{
                    height: `calc(100% - ${headerHeight}px)`,
                    flex: 1,
                    position: 'relative',
                    display: 'flex'
                }}>
                <Box
                    sx={{
                        flex: 1,
                        display: 'flex',
                        flexDirection: 'column'
                    }}>
                    <Box
                        {...style.mainContainer}
                        sx={{
                            flex: 1,
                            marginTop: `${headerHeight + 20}px`,
                            overflow: 'auto'
                        }}>
                        {element}
                    </Box>
                </Box>
            </Box>
        </Box>
    );
}
