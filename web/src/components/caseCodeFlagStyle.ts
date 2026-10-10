import type { CSSProperties } from 'react'
import { hashSeed, randomSource } from './seededRandom'

export function caseCodeFlagStyle(caseId: string, codeId: string): CSSProperties {
    // Keep each note's placement stable across renders and from creation to review.
    const random = randomSource(hashSeed(`ombuddi-code-tape:${caseId}:${codeId}`))
    if (random() >= 0.05) return {}
    return {
        transform: `rotate(${random() < 0.5 ? -1 : 1}deg)`,
        transformOrigin: '50% 0',
    }
}
