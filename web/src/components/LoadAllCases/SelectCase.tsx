import { Box } from '@mui/material'
import { useGetter } from '../../tools/db_tools/useGetter'
import { CaseType } from '../../types/majorTypes'
import { Add, Commit } from '@mui/icons-material'
import { CaseCardThin } from './CaseCardThin'
import { CaseCard } from './CaseCard'

export function SelectCase() {
    const casesRes = useGetter<CaseType[]>(['get_all_cases'])

    return (
        <Box
            sx={{
                display: 'grid',
                gap: 2,

                gridTemplateColumns: {
                    xs: '1fr',
                    md: 'repeat(2, minmax(0, 1fr))',
                }
            }}>
            <CaseCardThin
                Icon={<Add />}
                text={'Add Case'}
                link={'/add_case'}
            />
            <CaseCardThin
                Icon={<Commit />}
                text={'Log Without Case'}
                link={'/log_without_case'}
            />
            {casesRes.data?.map((caseItem) => (
                <CaseCard
                    key={caseItem.id}
                    caseItem={caseItem}
                />
            ))}
        </Box>
    );
}
