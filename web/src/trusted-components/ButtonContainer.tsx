import { Box, Stack } from '@mui/material'

export function ButtonContainer(props: { children: React.ReactNode }) {
    const { children } = props

    return (
        <Box
            display={'flex'}
            flex={1}
            flexDirection={'row-reverse'}
            mt={1}
        >
            <Stack
                spacing={2}
                direction={'row'}
            >
                {children}
            </Stack>
        </Box>
    )
}
