import { Box, Typography } from '@mui/material'
import { Stack } from '@mui/system'

export function WelcomePage() {
    return (
        <Box>
            <Stack spacing={2}>
                <Box>
                    <Typography variant={'h5'}>Welcome to Ombuddi.com</Typography>
                </Box>
                <Box>
                    <Typography variant={'h6'}>What Is Ombuddi?</Typography>
                    <Box>
                        Ombuddi is an application that uses cryptographic hashing to provide Ombuds with secure logging
                        and report-generation tools that adhere to the standards set by the International Ombuds
                        Association.
                    </Box>
                </Box>
                <Box>
                    <Typography variant={'h6'}>But Why?</Typography>
                    <Box>
                        At the time of development, every known ombuds logging application is a solution jury-rigged
                        from student conduct software, fails basic security measures, or involves a significant learning
                        curve to tame a significantly broader suite of tools (e.g. Excel). Ombuddi is the first
                        application made by an Ombuds to exclusively solve Ombuds-related challenges.
                    </Box>
                </Box>
                <Box>
                    <Typography variant={'h6'}>Leading Security Standards</Typography>
                    <Box>It's got some.</Box>
                </Box>
                <Box>
                    <Typography variant={'h6'}>How Do I Get Started?</Typography>
                </Box>
            </Stack>
        </Box>
    )
}
