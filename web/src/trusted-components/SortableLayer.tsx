import { SyntheticListenerMap } from '@dnd-kit/core/dist/hooks/utilities'
import { Box } from '@mui/material'
import { Delete, DragIndicator } from '@mui/icons-material'
import { usePalette } from '../tools/usePalette'

interface SortableType<T extends { id: string }> {
    item: T
    listeners: SyntheticListenerMap
    patch?: (newItem: T) => void
    trash?: (id: string) => void
    disabled?: boolean
    defaultExpanded?: boolean
}

export function SortableLayer<T extends { id: string; title: string }>({
    item,
    listeners,
    // patch,
    trash,
    disabled = false,
}: SortableType<T>) {
    const color = usePalette()

    // function update(newVal: Partial<T>) {
    //     patch({ ...item, ...newVal })
    // }

    return (
        <>
            <Box
                {...listeners}
                {...color.primary}
                marginRight={1}
                sx={{ cursor: 'grab' }}
                display={'flex'}
                height={'100%'}
                paddingLeft={1}
                paddingRight={1}
                flex={1}
                padding={0.5}
                margin={0.5}
            >
                {!disabled && (
                    <Box
                        display={'flex'}
                        height={'100%'}
                        alignItems={'center'}
                    >
                        <Box
                            marginRight={1}
                            display={'flex'}
                            alignItems={'center'}
                        >
                            <DragIndicator />
                        </Box>
                    </Box>
                )}
                <Box
                    display={'flex'}
                    flex={1}
                    alignItems={'center'}
                    fontWeight={'bold'}
                >
                    {item.title}
                </Box>
                {trash && (
                    <Box
                        display={'flex'}
                        height={'100%'}
                        alignItems={'center'}
                    >
                        <Box
                            marginLeft={1}
                            display={'flex'}
                            alignItems={'center'}
                        >
                            <Delete />
                        </Box>
                    </Box>
                )}
            </Box>
        </>
    )
}
