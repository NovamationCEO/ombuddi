import { Add, Commit } from '@mui/icons-material'
import { Box, Typography } from '@mui/material'
import React from 'react'
import { CaseCard } from '../components/LoadAllCases/CaseCard'
import { CaseCardThin } from '../components/LoadAllCases/CaseCardThin'
import { useGetter } from '../tools/db_tools/useGetter'
import { CaseType } from '../types/majorTypes'

function SectionHeader({ children }: { children: React.ReactNode }) {
    return (
        <Typography
            variant="overline"
            sx={{ display: 'block', mt: 2, mb: 0.5, color: 'text.secondary', fontWeight: 600 }}
        >
            {children}
        </Typography>
    )
}

export function Cases() {
    const activeRes = useGetter<CaseType[]>(['get_cases_by_status', 'active'])
    const monitoringRes = useGetter<CaseType[]>(['get_cases_by_status', 'monitoring'])
    const closedRes = useGetter<CaseType[]>(['get_cases_by_status', 'closed'])

    const grid = {
        display: 'grid',
        gap: 2,
        gridTemplateColumns: { xs: '1fr', md: 'repeat(2, minmax(0, 1fr))' },
    }

    return (
        <Box sx={{ p: 1 }}>
            <Box sx={grid}>
                <CaseCardThin Icon={<Add />} text={'Add Case'} link={'/add_case'} />
                <CaseCardThin Icon={<Commit />} text={'Log Without Case'} link={'/log_without_case'} />
            </Box>

            {!!activeRes.data?.length && (
                <>
                    <SectionHeader>Active</SectionHeader>
                    <Box sx={grid}>
                        {activeRes.data.map((c) => (
                            <CaseCard key={c.id} caseItem={c} />
                        ))}
                    </Box>
                </>
            )}

            {!!monitoringRes.data?.length && (
                <>
                    <SectionHeader>Monitoring</SectionHeader>
                    <Box sx={grid}>
                        {monitoringRes.data.map((c) => (
                            <CaseCard key={c.id} caseItem={c} />
                        ))}
                    </Box>
                </>
            )}

            {!!closedRes.data?.length && (
                <>
                    <SectionHeader>Closed</SectionHeader>
                    <Box sx={grid}>
                        {closedRes.data.map((c) => (
                            <CaseCard key={c.id} caseItem={c} muted />
                        ))}
                    </Box>
                </>
            )}
        </Box>
    )
}
