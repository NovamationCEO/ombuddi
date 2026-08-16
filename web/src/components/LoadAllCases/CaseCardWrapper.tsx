import { Card, CardActionArea, SxProps, Theme } from '@mui/material'
import { institutionalPalette as palette } from '../../theme/institutionalPalette'

export function CaseCardWrapper(props: {
    children: React.ReactNode
    onClick?: () => void
    accentColor?: string
    sx?: SxProps<Theme>
}) {
    const { children, onClick, accentColor = palette.blueGreen, sx } = props

    return (
        <Card
            elevation={0}
            sx={{
                position: 'relative',
                height: '100%',
                overflow: 'hidden',
                color: palette.text,
                bgcolor: palette.surface,
                border: `1px solid ${palette.border}`,
                borderRadius: 3,
                transition: 'transform 140ms ease, background-color 140ms ease, border-color 140ms ease',
                '&::before': {
                    content: '""',
                    position: 'absolute',
                    top: 0,
                    bottom: 0,
                    left: 0,
                    width: 4,
                    bgcolor: accentColor,
                    zIndex: 1,
                },
                '&:hover': {
                    transform: 'translateY(-2px)',
                    bgcolor: palette.surfaceRaised,
                    borderColor: palette.borderStrong,
                },
                ...(sx as object),
            }}
        >
            <CardActionArea
                onClick={onClick}
                sx={{ height: '100%', display: 'block', color: 'inherit' }}
            >
                {children}
            </CardActionArea>
        </Card>
    )
}
