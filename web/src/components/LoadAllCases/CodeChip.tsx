import { Chip } from '@mui/material'
import { CodeType } from '../../types/majorTypes'
import { useGetter } from '../../tools/db_tools/useGetter'

export function CodeChip(props: { code: string }) {
    const { code } = props
    const codeRes = useGetter<CodeType>(['get_code_by_id', code])
    return (
        <Chip
            label={codeRes.data?.description}
            color={'primary'}
            variant={'outlined'}
            size={'small'}
            sx={{ bgcolor: '#eeeeee' }}
        />
    )
}
