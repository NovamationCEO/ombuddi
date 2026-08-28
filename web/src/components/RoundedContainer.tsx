import { Box } from '@mui/material'
import type { ReactNode } from 'react'

export function RoundedContainer(props: { title: string; children?: ReactNode }) {
    const { title, children } = props
    return (
        <Box
            sx={{
                flex: 1,
                minWidth: 0,
                color: 'text.primary',
                bgcolor: 'background.paper',
                border: '1px solid',
                borderColor: 'divider',
                borderRadius: 3,
                overflow: 'hidden',
                boxShadow: (theme) => `0 5px 16px ${theme.vars.palette.app.shadow}`,
                position: 'relative',
            }}
        >
            <Box
                sx={{
                    px: 2,
                    py: 1.25,
                    bgcolor: 'secondary.dark',
                    color: 'primary.contrastText',
                    fontWeight: 700,
                }}
            >
                {title}
            </Box>
            <Box sx={{ p: 2 }}>{children}</Box>
        </Box>
    )
}
