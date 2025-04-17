import { Box, Stack } from '@mui/system'
import { useNavigate } from 'react-router-dom'
import { Button } from '@mui/material'

export function RestrictedPage() {
    const navigate = useNavigate()

    return (
        <Box>
            <Stack spacing={2}>
                <Box>You do not have access to view this data</Box>
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
