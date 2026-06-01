import { Box } from '@mui/material'
import type { ReactNode } from 'react'

export function RoundedContainer(props: { title: string; children?: ReactNode }) {
    const { title, children } = props
    return (
        <Box
            sx={{
                flex: 1,
                border: '1px solid black',
                borderRadius: 2,
                overflow: 'hidden',
                boxShadow: 2,
                position: 'relative'
            }}>
            <Box
                sx={{
                    bgcolor: '#1976d2',
                    color: 'white',
                    paddingLeft: 2,
                    paddingTop: 1,
                    paddingBottom: 1,
                    fontWeight: 'bold'
                }}>
                {title}
            </Box>
            <Box sx={{
                padding: 2
            }}>{children}</Box>
        </Box>
    );
}
