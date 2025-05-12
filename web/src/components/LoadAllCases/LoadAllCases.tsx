import { Box } from '@mui/system'
import { useGetter } from '../../tools/db_tools/useGetter'

export function LoadAllCases() {
    const casesRes = useGetter<any[]>(['get_all_cases'])

    console.log(casesRes.data)

    if (!casesRes.data?.length) {
        return <Box>No cases</Box>
    }
    return (
        <Box>
            {casesRes.data.map((caseItem) => (
                <Box key={caseItem.id}>
                    <Box display={'flex'}>
                        <Box flex={1}>
                            <h3>{caseItem.name}</h3>
                            <p>
                                <em>{caseItem.description}</em>
                            </p>
                        </Box>
                        <Box>
                            <img
                                src={`https://picsum.photos/seed/${caseItem.name}/60/60`}
                                alt={caseItem.name}
                                style={{ width: 60, height: 60 }}
                            />
                        </Box>
                    </Box>
                    <Box
                        display={'flex'}
                        flexWrap={'wrap'}
                    >
                        {caseItem.codes.map((code: string) => (
                            <Box
                                key={code}
                                m={1}
                            >
                                {code}
                            </Box>
                        ))}
                    </Box>
                </Box>
            ))}
        </Box>
    )
}
