import { ArrowForward } from '@mui/icons-material'
import { Box, CardContent, Typography } from '@mui/material'
import { useNavigate } from 'react-router-dom'
import { institutionalPalette as palette } from '../../theme/institutionalPalette'
import { CaseType } from '../../types/majorTypes'
import { CaseCodeRow } from './CaseCodeRow'
import { CaseCardWrapper } from './CaseCardWrapper'

const statusStyles = {
    active: {
        label: 'Active',
        accent: palette.blueGreen,
        color: 'var(--mui-palette-secondary-main)',
        background: 'rgba(var(--mui-palette-secondary-mainChannel) / 0.14)',
    },
    monitoring: {
        label: 'Monitoring',
        accent: 'var(--mui-palette-warning-main)',
        color: 'var(--mui-palette-warning-main)',
        background: 'rgba(var(--mui-palette-warning-mainChannel) / 0.14)',
    },
    closed: {
        label: 'Closed',
        accent: 'var(--mui-palette-text-disabled)',
        color: 'var(--mui-palette-text-secondary)',
        background: 'var(--mui-palette-action-hover)',
    },
} as const

function formatCaseDate(value: Date) {
    return new Date(value).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
}

export function CaseCard({ caseItem }: { caseItem: CaseType }) {
    const navigate = useNavigate()
    const normalizedStatus = caseItem.status?.toLowerCase() as keyof typeof statusStyles
    const status = statusStyles[normalizedStatus] ?? statusStyles.active

    return (
        <CaseCardWrapper
            onClick={() => navigate(`/case/${caseItem.id}`)}
            accentColor={status.accent}
        >
            <CardContent
                sx={{
                    p: { xs: 2, sm: 2.25 },
                    pl: { xs: 2.5, sm: 2.75 },
                    display: 'grid',
                    gridTemplateColumns: { xs: '62px minmax(0, 1fr)', sm: '72px minmax(0, 1fr) auto' },
                    columnGap: { xs: 1.5, sm: 2 },
                    rowGap: 1,
                    alignItems: 'start',
                    '&:last-child': { pb: { xs: 2, sm: 2.25 } },
                }}
            >
                <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 0.75 }}>
                    <Box
                        component="img"
                        src={`https://picsum.photos/seed/${caseItem.id}/72/72`}
                        alt=""
                        sx={{
                            width: { xs: 54, sm: 60 },
                            height: { xs: 54, sm: 60 },
                            display: 'block',
                            objectFit: 'cover',
                            bgcolor: palette.surfaceRaised,
                            borderRadius: 2.25,
                            boxShadow: '0 6px 14px var(--mui-palette-app-shadow)',
                        }}
                    />
                    <Box
                        sx={{
                            width: '100%',
                            px: 0.5,
                            py: 0.25,
                            maxWidth: 72,
                            boxSizing: 'border-box',
                            color: status.color,
                            bgcolor: status.background,
                            borderRadius: 4,
                            fontSize: '0.64rem',
                            fontWeight: 700,
                            lineHeight: 1.4,
                            textAlign: 'center',
                            whiteSpace: 'nowrap',
                        }}
                    >
                        {status.label}
                    </Box>
                </Box>

                <Box sx={{ minWidth: 0 }}>
                    <Typography
                        variant="h6"
                        component="h2"
                        sx={{ color: palette.text, fontWeight: 600, lineHeight: 1.25, mb: 0.5 }}
                    >
                        {caseItem.name}
                    </Typography>
                    {caseItem.description && (
                        <Typography
                            variant="body2"
                            sx={{
                                color: palette.muted,
                                mb: caseItem.codes?.length ? 1.25 : 0,
                                display: '-webkit-box',
                                WebkitLineClamp: 2,
                                WebkitBoxOrient: 'vertical',
                                overflow: 'hidden',
                            }}
                        >
                            {caseItem.description}
                        </Typography>
                    )}

                    {!!caseItem.codes?.length && <CaseCodeRow codeIds={caseItem.codes} />}
                </Box>

                <Box
                    sx={{
                        gridColumn: { xs: '2', sm: 'auto' },
                        minWidth: { sm: 122 },
                        display: 'flex',
                        flexDirection: { xs: 'row', sm: 'column' },
                        alignItems: { xs: 'center', sm: 'flex-end' },
                        justifyContent: { xs: 'space-between', sm: 'space-between' },
                        alignSelf: 'stretch',
                        gap: 0.5,
                        color: palette.muted,
                        textAlign: { sm: 'right' },
                    }}
                >
                    <Box>
                        <Typography sx={{ fontSize: '0.7rem' }}>
                            Updated {formatCaseDate(caseItem.updatedAt)}
                        </Typography>
                        <Typography sx={{ fontSize: '0.68rem', opacity: 0.76 }}>
                            Created {formatCaseDate(caseItem.createdAt)}
                        </Typography>
                    </Box>
                    <ArrowForward sx={{ color: palette.purpleLight, fontSize: 19 }} />
                </Box>
            </CardContent>
        </CaseCardWrapper>
    )
}
