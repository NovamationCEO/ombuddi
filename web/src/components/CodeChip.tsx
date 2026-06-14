import { Chip, lighten } from '@mui/material'
import { useGetter } from '../tools/db_tools/useGetter'
import { ioaCodesById } from '../constants/ioaConstants'
import { CodeType } from '../types/majorTypes'
import { usePalette } from '../tools/usePalette'

/**
 * Renders a single code chip given its id. IOA reference codes are resolved
 * from the in-code constants; everything else falls back to /get_code_by_id.
 *
 * IOA codes get a distinct (slightly tinted) background so the ombuds can
 * tell at a glance which codes are the IOA-standard categories vs. their
 * organization's custom ones.
 */
export function CodeChip(props: { code: string; compact?: boolean }) {
    const { code, compact = false } = props
    const palette = usePalette()

    const ioaCode = ioaCodesById.get(code)

    // Hooks run unconditionally, but useGetter is gated to skip when any key
    // segment is falsy — so passing undefined for the id when this is an IOA
    // code avoids an unnecessary /get_code_by_id call.
    const customCodeRes = useGetter<CodeType | undefined>([
        'get_code_by_id',
        ioaCode ? undefined : code,
    ])

    if (ioaCode) {
        return (
            <Chip
                label={compact ? ioaCode.code : `${ioaCode.code}: ${ioaCode.description}`}
                sx={{
                    bgcolor: lighten(palette.primary.bgcolor, 0.8),
                    transition: 'all 0.3s ease',
                    '&:hover': { bgcolor: lighten(palette.primary.bgcolor, 0.7) },
                }}
            />
        )
    }

    if (customCodeRes.data) {
        return <Chip label={compact ? customCodeRes.data.code : `${customCodeRes.data.code}: ${customCodeRes.data.description}`} />
    }

    return null
}
