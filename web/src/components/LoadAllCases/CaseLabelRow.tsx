import { useLayoutEffect, useRef, useState, type ReactNode } from 'react'

/** Keep one compact row, using its actual width rather than a fixed label limit. */
export function CaseLabelRow({
    items,
    kind,
}: {
    items: { id: string; content: ReactNode }[]
    kind: 'codes' | 'themes'
}) {
    const rowRef = useRef<HTMLSpanElement>(null)
    const measureRef = useRef<HTMLSpanElement>(null)
    const [visibleCount, setVisibleCount] = useState(items.length)
    const [firstWidth, setFirstWidth] = useState<number>()
    // Remeasure when labels change even if the number of labels stays the same.
    useLayoutEffect(() => {
        const row = rowRef.current
        const measurement = measureRef.current
        if (!row || !measurement) return
        const measure = () => {
            const width = row.clientWidth
            if (!width) return
            const labels = [...measurement.querySelectorAll<HTMLElement>('[data-label-size]')]
            const widths = labels.map((label) => label.getBoundingClientRect().width)
            const more = measurement.querySelector<HTMLElement>('[data-more-size]')!.getBoundingClientRect().width
            const gap = 6
            if (widths.reduce((sum, value) => sum + value, 0) + Math.max(0, widths.length - 1) * gap <= width) {
                setVisibleCount(widths.length)
                setFirstWidth(undefined)
                return
            }
            let used = 0
            let count = 0
            for (const value of widths) {
                const next = used + (count ? gap : 0) + value
                if (next + gap + more > width) break
                used = next
                count += 1
            }
            // A single long label still gets a readable preview before the count.
            setVisibleCount(Math.max(1, count))
            setFirstWidth(count ? undefined : Math.max(0, width - (widths.length > 1 ? more + gap : 0)))
        }
        measure()
        if (typeof ResizeObserver === 'undefined') return
        const observer = new ResizeObserver(measure)
        observer.observe(row)
        measurement.querySelectorAll('[data-label-size], [data-more-size]').forEach((node) => observer.observe(node))
        return () => observer.disconnect()
    }, [items])

    const count = Math.min(visibleCount, items.length)
    return (
        <span
            className={`case-label-row case-file-${kind}`}
            ref={rowRef}
        >
            {items.slice(0, count).map((item, index) => (
                <span
                    className="case-label-item"
                    style={index === 0 && firstWidth !== undefined ? { maxWidth: firstWidth } : undefined}
                    key={item.id}
                >
                    {item.content}
                </span>
            ))}
            {items.length > count && (
                <span
                    className="case-file-more"
                    aria-label={`${items.length - count} more ${kind}`}
                >
                    +{items.length - count}
                </span>
            )}
            <span
                className="case-label-measure"
                aria-hidden="true"
                ref={measureRef}
            >
                {items.map((item) => (
                    <span
                        className="case-label-item"
                        data-label-size
                        key={item.id}
                    >
                        {item.content}
                    </span>
                ))}
                <span
                    className="case-file-more"
                    data-more-size
                >
                    +{items.length}
                </span>
            </span>
        </span>
    )
}
