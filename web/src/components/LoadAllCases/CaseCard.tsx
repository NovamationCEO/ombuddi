import { Box, CardContent, Typography } from '@mui/material'
import { CaseCardWrapper } from './CaseCardWrapper'
import { CaseType } from '../../types/majorTypes'
import { useNavigate } from 'react-router-dom'
import { CodeChip } from '../CodeChip'

export function CaseCard(props: { caseItem: CaseType; muted?: boolean }) {
    const { caseItem, muted = false } = props
    const navigate = useNavigate()

    if (!caseItem) {
        return null
    }
    return (
        <CaseCardWrapper
            onClick={() => navigate(`/case/${caseItem.id}`)}
            sx={muted ? { filter: 'grayscale(1)', opacity: 0.7 } : undefined}
        >
            <CardContent
                sx={{
                    display: 'flex',
                    flexDirection: { xs: 'column', sm: 'row' },
                    gap: 2,
                }}
            >
                <Box
                    sx={{
                        width: 84,
                        height: 84,
                        borderRadius: 2,
                        overflow: 'hidden',
                        flexShrink: 0,
                        alignSelf: { xs: 'flex-start', sm: 'center' },
                        bgcolor: 'grey.100',
                    }}
                >
                    <Box
                        component={'img'}
                        src={`https://picsum.photos/seed/${caseItem.id}/60/60`}
                        alt={caseItem.name}
                        sx={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    />
                </Box>
                <Box sx={{ flex: 1 }}>
                    <Typography
                        variant={'h6'}
                        component={'h3'}
                    >
                        {caseItem.name}
                    </Typography>
                    {!muted && caseItem.description && (
                        <Typography
                            variant={'body2'}
                            sx={{
                                color: 'text.secondary',
                                fontStyle: 'italic',
                                mt: 0.5
                            }}>
                            {caseItem.description}
                        </Typography>
                    )}
                </Box>
                <Box sx={{
                    textAlign: 'right'
                }}>
                    <Box sx={{
                        fontSize: 'small'
                    }}>Updated {new Date(caseItem.updatedAt).toDateString()}</Box>
                    <Box sx={{
                        fontSize: 'small'
                    }}>
                        <em>Created {new Date(caseItem.createdAt).toDateString()}</em>
                    </Box>
                </Box>
            </CardContent>
            {!!caseItem.codes?.length && (
                <Box
                    sx={{
                        mt: 2,
                        display: 'flex',
                        flexWrap: 'wrap',
                        gap: 1,
                        m: 1
                    }}>
                    {caseItem.codes.map((code: string) => (
                        <CodeChip
                            key={code}
                            code={code}
                        />
                    ))}
                </Box>
            )}
        </CaseCardWrapper>
    );
}
