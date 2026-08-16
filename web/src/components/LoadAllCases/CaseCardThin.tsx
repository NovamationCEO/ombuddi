import { Box, Typography } from '@mui/material'
import { ReactElement } from 'react'
import { useNavigate } from 'react-router-dom'
import { institutionalPalette as palette } from '../../theme/institutionalPalette'
import { CaseCardWrapper } from './CaseCardWrapper'

export function CaseCardThin(props: { Icon: ReactElement; text: string; link: string }) {
    const { Icon, text, link } = props
    const navigate = useNavigate()

    return (
        <CaseCardWrapper
            onClick={() => navigate(link)}
            accentColor={palette.purple}
        >
            <Box sx={{ minHeight: 76, px: 2.5, display: 'flex', alignItems: 'center', gap: 1.5 }}>
                <Box
                    sx={{
                        width: 42,
                        height: 42,
                        display: 'grid',
                        placeItems: 'center',
                        flexShrink: 0,
                        color: palette.purpleLight,
                        bgcolor: 'rgba(154, 108, 174, 0.15)',
                        borderRadius: 2,
                    }}
                >
                    {Icon}
                </Box>
                <Typography
                    variant="h6"
                    sx={{ color: palette.text, fontWeight: 600 }}
                >
                    {text}
                </Typography>
            </Box>
        </CaseCardWrapper>
    )
}
