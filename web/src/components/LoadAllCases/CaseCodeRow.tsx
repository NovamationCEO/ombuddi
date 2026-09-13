import { Box, Chip } from '@mui/material'
import { useLayoutEffect, useRef, useState } from 'react'
import { institutionalPalette as palette } from '../../theme/institutionalPalette'
import { useResolvedCaseCodes } from '../../tools/useResolvedCaseCodes'
import { CaseCodeTooltip } from '../CaseCodeTooltip'

const chipStyle = {
    flexShrink: 0,
    color: palette.blueGreen,
    bgcolor: 'rgba(var(--mui-palette-secondary-mainChannel) / 0.12)',
    border: '1px solid rgba(var(--mui-palette-secondary-mainChannel) / 0.32)',
} as const

export function CaseCodeRow({ codeIds }: { codeIds: string[] }) {
    const containerRef = useRef<HTMLDivElement | null>(null)
    const measurementRef = useRef<HTMLDivElement | null>(null)
    const [visibleCount, setVisibleCount] = useState(Math.min(codeIds.length, 2))

    const codes = useResolvedCaseCodes(codeIds)

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
    return (
        <Box
            ref={containerRef}
            sx={{ position: 'relative', minWidth: 0, minHeight: 32, overflow: 'hidden' }}
        >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
                {codes.slice(0, visibleCount).map((code) => (
                    <CaseCodeTooltip
                        key={code.id}
                        codes={codes}
                    >
                        <Chip
                            label={code.shortName}
                            size="small"
                            sx={chipStyle}
                        />
                    </CaseCodeTooltip>
                ))}
                {!!hiddenCount && (
                    <CaseCodeTooltip codes={codes}>
                        <Chip
                            label={`+${hiddenCount}`}
                            size="small"
                            sx={chipStyle}
                        />
                    </CaseCodeTooltip>
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
