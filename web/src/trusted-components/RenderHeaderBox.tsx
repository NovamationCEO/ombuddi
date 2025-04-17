import { Box } from '@mui/system'

export function RenderHeaderBox(props: { children: React.ReactNode }) {
    const { children } = props
    return <Box sx={{ whiteSpace: 'normal' }}>{children}</Box>
}
