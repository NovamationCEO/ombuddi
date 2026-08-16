import { Box } from '@mui/material'
import type { ReactNode } from 'react'

export function RoundedContainer(props: { title: string; children?: ReactNode }) {
    const { title, children } = props
    return (
        <Box
            sx={{
                flex: 1,
                minWidth: 0,
                color: '#183337',
                bgcolor: '#FFFFFF',
                border: '1px solid #D7E1DF',
                borderRadius: 3,
                overflow: 'hidden',
                boxShadow: '0 5px 16px rgba(24, 51, 55, 0.07)',
                position: 'relative',
            }}
        >
            <Box
                sx={{
                    px: 2,
                    py: 1.25,
                    bgcolor: '#234E51',
                    color: '#F3F2EC',
                    fontWeight: 700,
                }}
            >
                {title}
            </Box>
            <Box sx={{ p: 2 }}>{children}</Box>
        </Box>
    )
}
