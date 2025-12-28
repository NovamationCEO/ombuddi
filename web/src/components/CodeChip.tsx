import { Chip, lighten } from '@mui/material'
import { useGetter } from '../tools/db_tools/useGetter'
import { ioaCodes } from '../constants/ioaConstants'
import { CodeType } from '../types/majorTypes'
import { usePalette } from '../tools/usePalette'

export function CodeChip(props: { code: string }) {
    const { code } = props
    const ioaCode = ioaCodes.find((c) => c[0] === code)
    const palette = usePalette()

    const customCodeRes = useGetter<CodeType | undefined>(['get_code_by_id', code])

    if (ioaCode) {
        return (
            <Chip
                label={`${ioaCode[0]}: ${ioaCode[1]}`}
                sx={{
                    bgcolor: lighten(palette.primary.bgcolor, 0.8),
                    transition: 'all 0.3s ease',
                    '&:hover': { bgcolor: lighten(palette.primary.bgcolor, 0.7) },
                }}
            />
        )
    }

    if (customCodeRes.data) {
        return <Chip label={`${customCodeRes.data.code}: ${customCodeRes.data.description}`} />
    }

    return <Chip label={ioaCode} />
}
