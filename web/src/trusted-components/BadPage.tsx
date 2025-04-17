import { Box, Stack } from '@mui/system'
import { useNavigate } from 'react-router-dom'
import { Button } from '@mui/material'

export function BadPage() {
    const navigate = useNavigate()

    return (
        <Box>
            <Stack spacing={2}>
                <Box>Not Found</Box>
                <Box>
                    <Button
                        variant={'contained'}
                        onClick={() => navigate('/')}
                    >
                        Go Home
                    </Button>
                </Box>
            </Stack>
        </Box>
    )
}
