import type { CSSProperties } from 'react'
import {
    geometricPalettes,
    getPersonGeometricDescriptor,
    type GeometricPalette,
    type PersonGeometricDescriptor,
} from './personGeometricProfile'
import { PERSON_MONSTER_VERSION } from './personMonsterProfile'

function Frame({ kind, palette }: { kind: number; palette: GeometricPalette }) {
    const common = { fill: palette.field, stroke: palette.ink, strokeWidth: 4 }
    switch (kind) {
        case 1:
            return (
                <rect
                    x="12"
                    y="12"
                    width="76"
                    height="76"
                    rx="20"
                    {...common}
                />
            )
        case 2:
            return (
                <path
                    d="M50 7L93 50L50 93L7 50Z"
                    strokeLinejoin="round"
                    {...common}
                />
            )
        case 3:
            return (
                <path
                    d="M28 8H72L94 50L72 92H28L6 50Z"
                    strokeLinejoin="round"
                    {...common}
                />
            )
        case 4:
            return (
                <path
                    d="M50 6L90 29L83 78L50 95L17 78L10 29Z"
                    strokeLinejoin="round"
                    {...common}
                />
            )
        case 5:
            return (
                <path
                    d="M17 22C28 6 72 6 83 22C96 41 91 77 74 89C60 98 40 98 26 89C9 77 4 41 17 22Z"
                    {...common}
                />
            )
        default:
            return (
                <circle
                    cx="50"
                    cy="50"
                    r="42"
                    {...common}
                />
            )
    }
}

function FieldPattern({ scene, palette }: { scene: PersonGeometricDescriptor; palette: GeometricPalette }) {
    switch (scene.pattern) {
        case 1:
            return (
                <g
                    fill={palette.secondary}
                    opacity="0.7"
                >
                    <circle
                        cx="24"
                        cy="29"
                        r="5"
                    />
                    <circle
                        cx="76"
                        cy="29"
                        r="5"
                    />
                    <circle
                        cx="24"
                        cy="71"
                        r="5"
                    />
                    <circle
                        cx="76"
                        cy="71"
                        r="5"
                    />
                </g>
            )
        case 2:
            return (
                <g
                    stroke={palette.secondary}
                    strokeWidth="5"
                    opacity="0.72"
                >
                    <path d="M18 30L32 16M68 84L84 68" />
                    <path d="M18 70L32 84M68 16L84 32" />
                </g>
            )
        case 3:
            return (
                <g
                    fill="none"
                    stroke={palette.secondary}
                    strokeWidth="4"
                    opacity="0.75"
                >
                    <circle
                        cx="50"
                        cy="50"
                        r="31"
                    />
                    <circle
                        cx="50"
                        cy="50"
                        r="24"
                    />
                </g>
            )
        case 4:
            return (
                <g
                    stroke={palette.secondary}
                    strokeWidth="4"
                    opacity="0.7"
                >
                    <path d="M22 22L78 78" />
                    <path d="M22 78L78 22" />
                </g>
            )
        case 5:
            return (
                <g
                    fill={palette.secondary}
                    opacity="0.8"
                >
                    <rect
                        x="19"
                        y="24"
                        width="17"
                        height="6"
                        rx="3"
                    />
                    <rect
                        x="64"
                        y="70"
                        width="17"
                        height="6"
                        rx="3"
                    />
                    <rect
                        x="18"
                        y="70"
                        width="10"
                        height="6"
                        rx="3"
                    />
                    <rect
                        x="72"
                        y="24"
                        width="10"
                        height="6"
                        rx="3"
                    />
                </g>
            )
        default:
            return null
    }
}

function Motif({ scene, palette }: { scene: PersonGeometricDescriptor; palette: GeometricPalette }) {
    const transform = `translate(${scene.offset} 0) rotate(${scene.rotation} 50 50)`
    const common = { fill: palette.primary, stroke: palette.ink, strokeWidth: 4, strokeLinejoin: 'round' as const }
    switch (scene.motif) {
        case 1:
            return (
                <g transform={transform}>
                    <circle
                        cx="39"
                        cy="50"
                        r="18"
                        {...common}
                    />
                    <circle
                        cx="61"
                        cy="50"
                        r="18"
                        fill={palette.secondary}
                        stroke={palette.ink}
                        strokeWidth="4"
                    />
                    <circle
                        cx="50"
                        cy="50"
                        r="8"
                        fill={palette.background}
                        stroke={palette.ink}
                        strokeWidth="3"
                    />
                </g>
            )
        case 2:
            return (
                <g transform={transform}>
                    <path
                        d="M50 23L76 50L50 77L24 50Z"
                        {...common}
                    />
                    <path
                        d="M50 36L64 50L50 64L36 50Z"
                        fill={palette.secondary}
                        stroke={palette.ink}
                        strokeWidth="3"
                    />
                </g>
            )
        case 3:
            return (
                <g transform={transform}>
                    <path
                        d="M29 69L50 26L71 69Z"
                        {...common}
                    />
                    <circle
                        cx="50"
                        cy="58"
                        r="9"
                        fill={palette.secondary}
                        stroke={palette.ink}
                        strokeWidth="3"
                    />
                </g>
            )
        case 4:
            return (
                <g
                    transform={transform}
                    fill="none"
                    stroke={palette.primary}
                    strokeWidth="10"
                    strokeLinecap="round"
                >
                    <path d="M27 61Q39 30 50 50Q61 70 73 39" />
                    <circle
                        cx="50"
                        cy="50"
                        r="7"
                        fill={palette.secondary}
                        stroke={palette.ink}
                        strokeWidth="3"
                    />
                </g>
            )
        case 5:
            return (
                <g transform={transform}>
                    <rect
                        x="25"
                        y="29"
                        width="50"
                        height="13"
                        rx="6"
                        {...common}
                    />
                    <rect
                        x="25"
                        y="58"
                        width="50"
                        height="13"
                        rx="6"
                        fill={palette.secondary}
                        stroke={palette.ink}
                        strokeWidth="4"
                    />
                </g>
            )
        case 6:
            return (
                <g transform={transform}>
                    <circle
                        cx="50"
                        cy="50"
                        r="24"
                        fill="none"
                        stroke={palette.primary}
                        strokeWidth="10"
                    />
                    <path
                        d="M50 24V76"
                        stroke={palette.secondary}
                        strokeWidth="9"
                        strokeLinecap="round"
                    />
                </g>
            )
        case 7:
            return (
                <g transform={transform}>
                    <path
                        d="M50 22L58 41L79 42L63 56L68 77L50 65L32 77L37 56L21 42L42 41Z"
                        {...common}
                    />
                    <circle
                        cx="50"
                        cy="50"
                        r="7"
                        fill={palette.secondary}
                    />
                </g>
            )
        default:
            return (
                <g transform={transform}>
                    <circle
                        cx="50"
                        cy="50"
                        r="25"
                        {...common}
                    />
                    <path
                        d="M34 39H66M30 50H70M34 61H66"
                        stroke={palette.secondary}
                        strokeWidth="6"
                        strokeLinecap="round"
                    />
                </g>
            )
    }
}

function Detail({ kind, palette }: { kind: number; palette: GeometricPalette }) {
    const points = [
        [50, 18],
        [79, 34],
        [79, 67],
        [50, 82],
        [21, 67],
        [21, 34],
    ]
    return (
        <g
            fill={palette.background}
            stroke={palette.ink}
            strokeWidth="2"
        >
            {points.slice(0, 1 + kind).map(([x, y]) => (
                <circle
                    key={`${x}-${y}`}
                    cx={x}
                    cy={y}
                    r="3.5"
                />
            ))}
        </g>
    )
}

export function PersonGeometricPortrait({
    seed,
    version = PERSON_MONSTER_VERSION,
    size = '100%',
    style,
}: {
    seed: string
    version?: number
    size?: number | string
    style?: CSSProperties
}) {
    const scene = getPersonGeometricDescriptor(seed, version)
    const palette = geometricPalettes[scene.palette]
    return (
        <svg
            viewBox="0 0 100 100"
            width={size}
            height={size}
            aria-hidden="true"
            focusable="false"
            data-avatar-renderer="geometric"
            style={{ display: 'block', ...style }}
        >
            <circle
                cx="50"
                cy="50"
                r="48"
                fill={palette.background}
            />
            <Frame
                kind={scene.frame}
                palette={palette}
            />
            <FieldPattern
                scene={scene}
                palette={palette}
            />
            <Motif
                scene={scene}
                palette={palette}
            />
            <Detail
                kind={scene.detail}
                palette={palette}
            />
        </svg>
    )
}
