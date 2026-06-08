import { Box, Stack, Typography } from '@mui/material'
import { PersonForm } from './PersonForm'

/**
 * Page route at /add_person. Thin wrapper around the reusable PersonForm.
 * The inline-dialog use case in AddEntry mounts PersonForm directly inside
 * a Dialog instead of going through this route.
 */
export function AddPerson() {
    return (
        <Box>
            <Stack spacing={2}>
                <Typography variant="h4">Add Person</Typography>
                <PersonForm onSaved={() => null} />
            </Stack>
        </Box>
    )
}
