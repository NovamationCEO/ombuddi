import { Box, Chip, Tooltip, Typography } from '@mui/material'
import { useLayoutEffect, useMemo, useRef, useState } from 'react'
import { ioaCodesFull } from '../../constants/ioaConstants'
import { institutionalPalette as palette } from '../../theme/institutionalPalette'
import { CodeType } from '../../types/majorTypes'
import { useGetter } from '../../tools/db_tools/useGetter'
import { useOrganization } from '../../tools/useOrganization'

const chipStyle = {
    flexShrink: 0,
    color: palette.blueGreen,
    bgcolor: 'rgba(140, 181, 178, 0.12)',
    border: '1px solid rgba(140, 181, 178, 0.32)',
} as const

export function CaseCodeRow({ codeIds }: { codeIds: string[] }) {
    const organization = useOrganization()
    const customCodesRes = useGetter<CodeType[]>(['get_codes_by_organization_id', organization.id])
    const containerRef = useRef<HTMLDivElement | null>(null)
    const measurementRef = useRef<HTMLDivElement | null>(null)
    const [visibleCount, setVisibleCount] = useState(Math.min(codeIds.length, 2))

    const codes = useMemo(() => {
        const codeById = new Map([...ioaCodesFull, ...(customCodesRes.data ?? [])].map((code) => [code.id, code]))
        return codeIds.map((id) => {
            const code = codeById.get(id)
            return {
                id,
                shortName: code?.code ?? 'Code',
                description: code?.description ?? 'Code details loading…',
            }
        })
    }, [codeIds, customCodesRes.data])

    const measurementKey = codes.map((code) => code.shortName).join('|')

    useLayoutEffect(() => {
        const container = containerRef.current
        const measurement = measurementRef.current
        if (!container || !measurement || !codes.length) return

        const measure = () => {
            const availableWidth = container.clientWidth
            const chipWidths = Array.from(measurement.querySelectorAll<HTMLElement>('[data-measure-code]')).map(
                (chip) => chip.getBoundingClientRect().width,
            )
            const overflowWidth =
                measurement.querySelector<HTMLElement>('[data-measure-overflow]')?.getBoundingClientRect().width ?? 0
            const gap = 6
            const totalWidth = chipWidths.reduce((total, width, index) => total + width + (index ? gap : 0), 0)

            if (totalWidth <= availableWidth) {
                setVisibleCount(codes.length)
                return
            }

            let usedWidth = 0
            let nextVisibleCount = 0
            for (const width of chipWidths) {
                const nextWidth = usedWidth + (nextVisibleCount ? gap : 0) + width
                if (nextWidth + gap + overflowWidth > availableWidth) break
                usedWidth = nextWidth
                nextVisibleCount += 1
            }
            setVisibleCount(nextVisibleCount)
        }

        measure()
        if (typeof ResizeObserver === 'undefined') return

        const resizeObserver = new ResizeObserver(measure)
        resizeObserver.observe(container)
        return () => resizeObserver.disconnect()
    }, [codes.length, measurementKey])

    if (!codes.length) return null

    const hiddenCount = Math.max(0, codes.length - visibleCount)
    const tooltipContent = (
        <Box sx={{ py: 0.25 }}>
            {codes.map((code) => (
                <Typography
                    key={code.id}
                    component="div"
                    sx={{ fontSize: '0.9rem', lineHeight: 1.45, py: 0.35 }}
                >
                    <Box
                        component="span"
                        sx={{ fontWeight: 700 }}
                    >
                        {code.shortName}:
                    </Box>{' '}
                    {code.description}
                </Typography>
            ))}
        </Box>
    )

    return (
        <Box
            ref={containerRef}
            sx={{ position: 'relative', minWidth: 0, minHeight: 32, overflow: 'hidden' }}
        >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
                {codes.slice(0, visibleCount).map((code) => (
                    <Tooltip
                        key={code.id}
                        title={tooltipContent}
                        arrow
                        placement="top"
                    >
                        <Chip
                            label={code.shortName}
                            size="small"
                            sx={chipStyle}
                        />
                    </Tooltip>
                ))}
                {!!hiddenCount && (
                    <Tooltip
                        title={tooltipContent}
                        arrow
                        placement="top"
                    >
                        <Chip
                            label={`+${hiddenCount}`}
                            size="small"
                            sx={chipStyle}
                        />
                    </Tooltip>
                )}
            </Box>

            <Box
                ref={measurementRef}
                aria-hidden="true"
                sx={{
                    position: 'absolute',
                    left: 0,
                    top: 0,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 0.75,
                    visibility: 'hidden',
                    pointerEvents: 'none',
                    whiteSpace: 'nowrap',
                }}
            >
                {codes.map((code) => (
                    <Chip
                        key={code.id}
                        data-measure-code
                        label={code.shortName}
                        size="small"
                        sx={chipStyle}
                    />
                ))}
                <Chip
                    data-measure-overflow
                    label={`+${codes.length}`}
                    size="small"
                    sx={chipStyle}
                />
            </Box>
        </Box>
    )
}
