import { Box } from '@mui/system'
import { useStyles } from '../tools/useStyles'
import { Header } from './Header'
import type { ReactNode } from 'react'

import { headerHeight } from '../constants/uiSizes'
import { PageMetadata } from './PageMetadata'

type PageAlternateProps = {
    element: ReactNode
    title: string
    description?: string
    indexable?: boolean
    canonicalPath?: string
    hideHeader?: boolean
    fullBleed?: boolean
    fixedColorScheme?: 'light' | 'dark'
}

export function PageAlternate({
    element,
    title,
    description,
    indexable = false,
    canonicalPath,
    hideHeader = false,
    fullBleed = false,
    fixedColorScheme,
}: PageAlternateProps) {
    const style = useStyles()

    return (
        <Box
            className={fixedColorScheme ? `mode-${fixedColorScheme}` : undefined}
            sx={{
                width: '100vw',
                height: '100vh',
                position: 'relative',
                display: 'flex',
                flexDirection: 'column',
                color: style.contrast,
                bgcolor: 'background.default',
            }}
        >
            <PageMetadata
                title={title}
                description={description}
                indexable={indexable}
                canonicalPath={canonicalPath}
            />
            {!hideHeader && <Header />}
            <Box
                sx={{
                    height: hideHeader ? '100%' : `calc(100% - ${headerHeight}px)`,
                    flex: 1,
                    position: 'relative',
                    display: 'flex',
                }}
            >
                <Box
                    sx={{
                        flex: 1,
                        display: 'flex',
                        flexDirection: 'column',
                        minWidth: 0,
                    }}
                >
                    <Box
                        {...(!fullBleed ? style.mainContainer : {})}
                        sx={{
                            flex: 1,
                            width: '100%',
                            minWidth: 0,
                            boxSizing: 'border-box',
                            marginTop: hideHeader ? 0 : `${headerHeight + 20}px`,
                            overflow: 'auto',
                        }}
                    >
                        {element}
                    </Box>
                </Box>
            </Box>
        </Box>
    )
}
