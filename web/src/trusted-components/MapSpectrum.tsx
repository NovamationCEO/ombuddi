import { Box } from '@mui/material'
import React from 'react'

export function MapSpectrum(props: { title: string; spectrum100: string[]; values: string[] }) {
    const { title, spectrum100, values } = props
    const [isOpen, setIsOpen] = React.useState(true)

    return (
        <Box
            fontSize={'small'}
            border={'1px solid lightgray'}
            padding={1}
            borderRadius={2}
            margin={1}
            bgcolor={'rgba(255, 255, 255, 0.5)'}
            onClick={() => setIsOpen((prev) => !prev)}
        >
            <Box fontWeight={'bold'}>{title}</Box>
            {isOpen && (
                <Box
                    marginTop={1}
                    display={'flex'}
                >
                    <Box boxShadow={'2px 2px 5px 2px gray'}>
                        {spectrum100.map((color, index) => (
                            <Box
                                key={index}
                                bgcolor={color}
                                height={2}
                                width={15}
                            />
                        ))}
                    </Box>
                    <Box
                        flex={1}
                        display={'flex'}
                        flexDirection={'column'}
                        justifyContent={'space-between'}
                        marginLeft={1}
                    >
                        {values.map((val) => (
                            <Box key={val}>{val}</Box>
                        ))}
                    </Box>
                </Box>
            )}
        </Box>
    )
}
