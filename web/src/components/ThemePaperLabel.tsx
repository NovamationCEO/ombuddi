import type { CSSProperties } from 'react'
import { Chip, type ChipProps } from '@mui/material'
import { hashSeed, randomSource } from './seededRandom'
import './ThemePaperLabel.css'

const papers = ['#f5edcf', '#e5edda', '#e6edf0', '#f0e3dc']
const foldChance = 0.05
const corners = ['top-left', 'top-right', 'bottom-left', 'bottom-right']

export function ThemePaperLabel({ theme, className, style, ...props }: Omit<ChipProps, 'label'> & { theme: string }) {
    const seed = hashSeed(`theme-label:${theme}`)
    const tilt = seed % 20 === 0 ? (seed % 40 === 0 ? -1 : 1) : 0
    const foldRandom = randomSource(hashSeed(`theme-fold:${theme}`))
    const foldedCorner = foldRandom() < foldChance ? corners[Math.floor(foldRandom() * corners.length)] : undefined
    const paperStyle = {
        '--theme-paper': papers[seed % papers.length],
        '--theme-tilt': `${tilt}deg`,
        '--theme-tape-tilt': `${seed % 2 ? -3 : 3}deg`,
        ...style,
    } as CSSProperties
    return (
        <Chip
            {...props}
            label={<>{theme}{foldedCorner && <span className="theme-paper-fold" aria-hidden="true" />}</>}
            className={`theme-paper-label ${foldedCorner ? `theme-paper-label--fold-${foldedCorner}` : ''} ${className ?? ''}`}
            style={paperStyle}
        />
    )
}
