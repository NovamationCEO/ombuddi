import { Box } from '@mui/material'
import { useUpperBar } from '../libraries/useUpperBar'
import { sidebarTopHeight } from '../constants/uiSizes'

export function useSetUpperImage(file: string) {
    const setContent = useUpperBar((state) => state.setContent)
    const position = useUpperBar((state) => state.position)
    const height = sidebarTopHeight[position]

    setTimeout(
        () =>
            setContent(
                <Box
                    overflow={'auto'}
                    maxHeight={height}
                    position={'relative'}
                >
                    <img
                        src={`src/assets/samples/${file}`}
                        width={'100%'}
                    />
                </Box>,
            ),
        50, // Prevents warning about rendering components on top of each other.
    )
}
