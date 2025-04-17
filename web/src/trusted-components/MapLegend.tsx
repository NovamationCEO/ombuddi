import { Box } from '@mui/material'
import React from 'react'

export function MapLegend(props: {
    title?: string
    pairs: { [x: string]: string }
    shape?: 'area' | 'point' | 'line'
}) {
    const { title, pairs, shape = 'area' } = props
    const [isOpen, setIsOpen] = React.useState(true)

    const shapes = {
        area: { width: 19, height: 14, borderRadius: '2%' },
        point: { width: 15, height: 15, borderRadius: '50%' },
        line: { width: 19, height: 4, borderRadius: '3px' },
    }

    return (
        <Box
            fontSize={'small'}
            border={'1px solid lightgray'}
            padding={1}
            borderRadius={2}
            margin={1}
            bgcolor={'rgba(255, 255, 255, 0.6 )'}
            onClick={() => setIsOpen((prev) => !prev)}
        >
            {title ? <Box fontWeight={'bold'}>{title}</Box> : null}
            {isOpen && (
                <Box marginTop={1}>
                    {Object.keys(pairs).map((key) => (
                        <Box
                            display={'flex'}
                            key={key}
                            alignItems={'center'}
                            marginBottom={0.25}
                        >
                            <Box
                                bgcolor={pairs[key]}
                                {...shapes[shape]}
                                sx={{ boxShadow: '1px 1px 5px #2E2C2CFF' }}
                            />
                            <Box
                                marginLeft={1}
                                fontSize={'small'}
                            >
                                {key}
                            </Box>
                        </Box>
                    ))}
                </Box>
            )}
        </Box>
    )
}
