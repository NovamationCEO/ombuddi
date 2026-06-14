import { useStyles } from '../../tools/useStyles'
import { Card, SxProps, Theme } from '@mui/material'

export function CaseCardWrapper(props: { children: React.ReactNode; onClick?: () => void; sx?: SxProps<Theme> }) {
    const style = useStyles()
    const { children, onClick, sx } = props

    return (
        <Card
            elevation={1}
            onClick={onClick}
            sx={{
                borderRadius: 2,
                transition: 'transform 120ms ease, box-shadow 120ms ease, all 0.5s ease',
                '&:hover': {
                    transform: 'translateY(-2px)',
                    boxShadow: 4,
                    bgcolor: '#F2FAF3FF',
                },
                borderColor: style.header.bgcolor,
                borderWidth: 2,
                borderStyle: 'solid',
                bgcolor: '#eeeeee',
                cursor: 'pointer',
                ...sx,
            }}
        >
            {children}
        </Card>
    )
}
