import { pageLayoutStyle, pageTitleStyle, pageContentStyle } from '../../theme/pageLayout'
import { Box, Stack, Typography } from '@mui/material'
import { PersonForm } from './PersonForm'

/**
 * Page route at /add_person. Thin wrapper around the reusable PersonForm.
 * The inline-dialog use case in AddEntry mounts PersonForm directly inside
 * a Dialog instead of going through this route.
 */
export function AddPerson() {
    return (
        <Box sx={pageLayoutStyle}>
            <Stack spacing={2.5}>
                <Typography
                    component="h1"
                    variant="h4"
                    sx={pageTitleStyle}
                >
                    Add Person
                </Typography>
                <Box sx={pageContentStyle}>
                    <PersonForm onSaved={() => null} />
                </Box>
            </Stack>
        </Box>
    )
}
