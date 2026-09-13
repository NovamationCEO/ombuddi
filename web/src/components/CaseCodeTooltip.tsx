import { Box, Tooltip, Typography } from '@mui/material'
import type { ReactElement } from 'react'
import type { ResolvedCaseCode } from '../tools/useResolvedCaseCodes'

export function CaseCodeTooltip(props: {
    codes: ResolvedCaseCode[]
    children: ReactElement
    placement?: 'top' | 'top-start'
}) {
    const { codes, children, placement = 'top' } = props
    const content = (
        <Box sx={{ py: 0.25 }}>
            {codes.map((code) => (
                <Typography
                    key={code.id}
                    component="div"
                    sx={{ fontSize: '0.9rem', lineHeight: 1.45, py: 0.35 }}
                >
                    <Box component="span" sx={{ fontWeight: 700 }}>
                        {code.shortName}:
                    </Box>{' '}
                    {code.description}
                </Typography>
            ))}
        </Box>
    )

    return (
        <Tooltip title={content} arrow placement={placement}>
            {children}
        </Tooltip>
    )
}
