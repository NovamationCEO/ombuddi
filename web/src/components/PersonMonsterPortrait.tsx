// SVG portrait renderer and its compact MUI avatar wrapper.
import { Avatar } from '@mui/material'
import type { CSSProperties } from 'react'
import {
    getPersonMonsterDescriptor,
    monsterPalettes,
    PERSON_MONSTER_VERSION,
    type MonsterPalette,
    type PersonMonsterDescriptor,
} from './personMonsterProfile'

const ink = '#34251f'

const bodyPaths = [
    'M17 96C13 81 13 54 19 36C24 21 36 14 50 14C65 14 77 22 82 37C88 55 87 82 83 96Z',
    'M25 96C21 78 20 47 26 29C31 15 40 9 50 9C61 9 70 16 75 31C81 50 80 80 76 96Z',
    'M9 96C10 70 15 46 27 29C35 18 43 14 50 14C59 14 68 19 76 31C86 47 91 71 91 96Z',
    'M15 96L22 42C24 24 35 15 50 12C66 15 76 25 79 43L86 96Z',
    'M13 96L17 80L13 71L19 62L15 52L22 45L20 34L30 31L34 21L44 23L50 13L57 23L68 21L71 31L82 34L80 45L87 52L83 62L89 72L83 80L87 96Z',
    'M14 96C13 82 17 76 14 67C10 57 18 51 18 42C18 31 28 29 33 22C39 13 47 17 51 12C57 17 66 13 71 22C78 29 86 31 83 42C83 51 91 57 86 67C82 76 88 82 85 96Z',
    'M7 96C7 79 9 54 19 38C27 24 38 19 50 19C63 19 74 25 82 39C91 55 93 80 92 96Z',
    'M21 96C15 79 16 58 25 43C31 33 36 29 40 27L34 19L46 24L50 14L55 24L68 18L62 29C70 33 77 40 81 52C87 68 85 84 80 96Z',
]

function Backdrop({ kind, color }: { kind: number; color: string }) {
    switch (kind) {
        case 1:
            return (
                <rect
                    x="5"
                    y="5"
                    width="90"
                    height="90"
                    rx="24"
                    fill={color}
                />
            )
        case 2:
            return (
                <path
                    d="M50 3L94 30L83 85L24 96L4 43Z"
                    fill={color}
                />
            )
        case 3:
            return (
                <path
                    d="M8 82C18 34 35 6 61 7C87 9 98 38 88 76C78 104 25 102 8 82Z"
                    fill={color}
                />
            )
        default:
            return (
                <circle
                    cx="50"
                    cy="50"
                    r="47"
                    fill={color}
                />
            )
    }
}

function Ears({ kind, palette }: { kind: number; palette: MonsterPalette }) {
    const shared = { fill: palette.accent, stroke: ink, strokeWidth: 4, strokeLinejoin: 'round' as const }
    switch (kind) {
        case 1:
            return (
                <g {...shared}>
                    <circle
                        cx="17"
                        cy="42"
                        r="10"
                    />
                    <circle
                        cx="83"
                        cy="42"
                        r="10"
                    />
                </g>
            )
        case 2:
            return (
                <g {...shared}>
                    <path d="M25 34L8 20L13 48Z" />
                    <path d="M75 34L92 20L87 48Z" />
                </g>
            )
        case 3:
            return (
                <g {...shared}>
                    <path d="M21 36C8 29 4 38 15 53C7 52 6 60 22 60Z" />
                    <path d="M79 36C92 29 96 38 85 53C93 52 94 60 78 60Z" />
                </g>
            )
        case 4:
            return (
                <g {...shared}>
                    <path d="M31 29C18 22 16 4 26 3C38 3 39 22 38 31Z" />
                    <path d="M69 29C82 22 84 4 74 3C62 3 61 22 62 31Z" />
                </g>
            )
        case 5:
            return (
                <g {...shared}>
                    <path d="M25 38C12 37 7 28 11 21C22 20 30 26 31 36Z" />
                    <path d="M75 38C88 37 93 28 89 21C78 20 70 26 69 36Z" />
                </g>
            )
        default:
            return null
    }
}

function HornStripes({ kind, pattern, palette }: { kind: number; pattern: number; palette: MonsterPalette }) {
    if (pattern === 0 || kind === 7) return null
    const stroke = pattern === 1 ? palette.body : pattern === 2 ? '#f8efe0' : palette.detail
    return (
        <g
            fill="none"
            stroke={stroke}
            strokeWidth="3"
            strokeLinecap="round"
            opacity="0.95"
        >
            {kind === 0 && (
                <>
                    <path d="M25 20L17 17" />
                    <path d="M75 20L83 17" />
                </>
            )}
            {kind === 1 && (
                <>
                    <path d="M47 15L55 15" />
                    <path d="M46 9L54 9" />
                </>
            )}
            {kind === 2 && (
                <>
                    <path d="M26 22L34 22" />
                    <path d="M46 14L54 14" />
                    <path d="M67 22L75 22" />
                </>
            )}
            {kind === 3 && (
                <>
                    <path d="M20 28C13 23 13 16 18 13" />
                    <path d="M80 28C87 23 87 16 82 13" />
                </>
            )}
            {kind === 4 && (
                <>
                    <path d="M29 25L24 20" />
                    <path d="M71 25L76 20" />
                </>
            )}
            {kind === 5 && (
                <>
                    <path d="M23 22L15 16" />
                    <path d="M77 22L85 16" />
                </>
            )}
            {kind === 6 && (
                <>
                    <circle
                        cx="24"
                        cy="12"
                        r="3"
                    />
                    <circle
                        cx="76"
                        cy="12"
                        r="3"
                    />
                </>
            )}
        </g>
    )
}

function Horns({ scene, palette }: { scene: PersonMonsterDescriptor; palette: MonsterPalette }) {
    const shared = { fill: palette.accent, stroke: ink, strokeWidth: 4, strokeLinejoin: 'round' as const }
    let horns
    switch (scene.horns) {
        case 0:
            horns = (
                <g {...shared}>
                    <path d="M31 29C18 27 11 16 15 5C27 9 33 18 34 30Z" />
                    <path d="M69 29C82 27 89 16 85 5C73 9 67 18 66 30Z" />
                </g>
            )
            break
        case 1:
            horns = (
                <path
                    d="M42 25L46 3C47-1 53-1 54 3L58 25Z"
                    {...shared}
                />
            )
            break
        case 2:
            horns = (
                <g {...shared}>
                    <path d="M23 32L29 10L38 31Z" />
                    <path d="M41 27L50 3L59 27Z" />
                    <path d="M62 31L72 10L78 33Z" />
                </g>
            )
            break
        case 3:
            horns = (
                <g
                    fill="none"
                    stroke={palette.accent}
                    strokeWidth="8"
                    strokeLinecap="round"
                >
                    <path d="M30 29C13 30 10 10 24 8C35 6 38 18 31 22" />
                    <path d="M70 29C87 30 90 10 76 8C65 6 62 18 69 22" />
                </g>
            )
            break
        case 4:
            horns = (
                <g {...shared}>
                    <path d="M27 31L20 17L35 27Z" />
                    <path d="M73 31L80 17L65 27Z" />
                </g>
            )
            break
        case 5:
            horns = (
                <g
                    fill="none"
                    stroke={palette.accent}
                    strokeWidth="7"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                >
                    <path d="M32 30L22 15L13 8M22 15L11 18M19 11L20 3" />
                    <path d="M68 30L78 15L87 8M78 15L89 18M81 11L80 3" />
                </g>
            )
            break
        case 6:
            horns = (
                <g {...shared}>
                    <path d="M35 30L26 12" />
                    <path d="M65 30L74 12" />
                    <circle
                        cx="24"
                        cy="9"
                        r="7"
                    />
                    <circle
                        cx="76"
                        cy="9"
                        r="7"
                    />
                </g>
            )
            break
        default:
            horns = null
    }
    return (
        <>
            {horns}
            <HornStripes
                kind={scene.horns}
                pattern={scene.hornPattern}
                palette={palette}
            />
        </>
    )
}

function Tuft({ kind, palette }: { kind: number; palette: MonsterPalette }) {
    const shared = { fill: palette.body, stroke: ink, strokeWidth: 4, strokeLinejoin: 'round' as const }
    switch (kind) {
        case 1:
            return (
                <path
                    d="M38 22C38 11 45 17 47 7C55 9 57 15 54 23Z"
                    {...shared}
                />
            )
        case 2:
            return (
                <path
                    d="M34 24C31 15 40 17 40 8C48 13 50 7 55 5C57 14 66 13 64 24Z"
                    {...shared}
                />
            )
        case 3:
            return (
                <path
                    d="M35 24C36 12 43 8 50 8C58 8 65 13 65 24Z"
                    {...shared}
                />
            )
        case 4:
            return (
                <path
                    d="M40 24C34 13 44 15 48 5C51 15 61 11 59 24Z"
                    {...shared}
                />
            )
        case 5:
            return (
                <path
                    d="M38 24C31 15 39 11 45 16C45 7 56 7 55 16C63 11 69 18 62 24Z"
                    {...shared}
                />
            )
        default:
            return null
    }
}

function Markings({ kind, palette }: { kind: number; palette: MonsterPalette }) {
    const color = palette.accent
    switch (kind) {
        case 1:
            return (
                <g
                    fill={color}
                    opacity="0.8"
                >
                    <circle
                        cx="27"
                        cy="66"
                        r="6"
                    />
                    <circle
                        cx="73"
                        cy="66"
                        r="6"
                    />
                </g>
            )
        case 2:
            return (
                <g
                    fill="none"
                    stroke={color}
                    strokeWidth="5"
                    strokeLinecap="round"
                >
                    <path d="M40 31L43 39" />
                    <path d="M50 29V38" />
                    <path d="M60 31L57 39" />
                </g>
            )
        case 3:
            return (
                <path
                    d="M45 28Q50 21 55 28L59 45Q50 41 41 45Z"
                    fill={color}
                    opacity="0.82"
                />
            )
        case 4:
            return (
                <path
                    d="M24 46Q50 35 76 46L72 58Q50 50 28 58Z"
                    fill={color}
                    opacity="0.72"
                />
            )
        case 5:
            return (
                <g
                    fill={color}
                    opacity="0.85"
                >
                    <circle
                        cx="29"
                        cy="61"
                        r="2.3"
                    />
                    <circle
                        cx="35"
                        cy="65"
                        r="1.8"
                    />
                    <circle
                        cx="71"
                        cy="61"
                        r="2.3"
                    />
                    <circle
                        cx="65"
                        cy="65"
                        r="1.8"
                    />
                </g>
            )
        case 6:
            return (
                <g
                    fill={color}
                    opacity="0.72"
                >
                    <circle
                        cx="25"
                        cy="40"
                        r="5"
                    />
                    <circle
                        cx="72"
                        cy="34"
                        r="4"
                    />
                    <circle
                        cx="78"
                        cy="72"
                        r="6"
                    />
                    <circle
                        cx="20"
                        cy="80"
                        r="3"
                    />
                </g>
            )
        case 7:
            return (
                <g
                    fill="none"
                    stroke={color}
                    strokeWidth="4"
                    strokeLinecap="round"
                >
                    <path d="M21 70L30 73" />
                    <path d="M19 78L30 79" />
                    <path d="M79 70L70 73" />
                    <path d="M81 78L70 79" />
                </g>
            )
        default:
            return null
    }
}

function Eyes({ kind }: { kind: number }) {
    const pupil = (x: number, y: number, rx = 5, ry = 7) => (
        <g>
            <ellipse
                cx={x}
                cy={y}
                rx={rx}
                ry={ry}
                fill={ink}
            />
            <circle
                cx={x + 1.5}
                cy={y - 2}
                r="1.5"
                fill="#fffaf0"
            />
        </g>
    )
    switch (kind) {
        case 1:
            return (
                <g>
                    <circle
                        cx="50"
                        cy="49"
                        r="12"
                        fill="#fffaf0"
                        stroke={ink}
                        strokeWidth="3"
                    />
                    {pupil(50, 49, 5, 6)}
                </g>
            )
        case 2:
            return (
                <>
                    {pupil(36, 50, 4, 9)}
                    {pupil(64, 50, 4, 9)}
                </>
            )
        case 3:
            return (
                <>
                    {pupil(35, 51, 7, 4)}
                    {pupil(65, 51, 7, 4)}
                </>
            )
        case 4:
            return (
                <>
                    {pupil(50, 40, 4, 5)}
                    {pupil(36, 53, 4, 5)}
                    {pupil(64, 53, 4, 5)}
                </>
            )
        case 5:
            return (
                <>
                    {pupil(34, 50, 5, 7)}
                    {pupil(67, 47, 4, 6)}
                </>
            )
        default:
            return (
                <>
                    {pupil(35, 50)}
                    {pupil(65, 50)}
                </>
            )
    }
}

function Mouth({ kind, palette }: { kind: number; palette: MonsterPalette }) {
    switch (kind) {
        case 1:
            return (
                <path
                    d="M38 68Q50 79 62 68"
                    fill="none"
                    stroke={ink}
                    strokeWidth="4"
                    strokeLinecap="round"
                />
            )
        case 2:
            return (
                <g>
                    <path
                        d="M36 67Q50 62 64 67Q62 83 50 83Q38 82 36 67Z"
                        fill={ink}
                    />
                    <path
                        d="M45 67L49 74L53 67"
                        fill="#fffaf0"
                    />
                </g>
            )
        case 3:
            return (
                <g>
                    <ellipse
                        cx="50"
                        cy="72"
                        rx="15"
                        ry="10"
                        fill={ink}
                    />
                    <path
                        d="M42 77Q50 70 58 77"
                        fill="none"
                        stroke={palette.accent}
                        strokeWidth="4"
                        strokeLinecap="round"
                    />
                </g>
            )
        case 4:
            return (
                <g>
                    <path
                        d="M36 67Q50 79 64 67Q62 84 50 84Q38 83 36 67Z"
                        fill={ink}
                    />
                    <path
                        d="M39 68H61"
                        stroke="#fffaf0"
                        strokeWidth="5"
                    />
                </g>
            )
        case 5:
            return (
                <path
                    d="M40 73Q46 67 51 73Q57 67 63 73"
                    fill="none"
                    stroke={ink}
                    strokeWidth="4"
                    strokeLinecap="round"
                />
            )
        default:
            return (
                <path
                    d="M37 69Q50 82 63 69"
                    fill={ink}
                    stroke={ink}
                    strokeWidth="3"
                    strokeLinejoin="round"
                />
            )
    }
}

function Accessory({
    kind,
    scene,
    palette,
}: {
    kind: number
    scene: PersonMonsterDescriptor
    palette: MonsterPalette
}) {
    switch (kind) {
        case 1:
            return (
                <g
                    fill="none"
                    stroke={ink}
                    strokeWidth="3"
                >
                    <circle
                        cx="35"
                        cy="50"
                        r="11"
                    />
                    <circle
                        cx="65"
                        cy="50"
                        r="11"
                    />
                    <path d="M46 50H54" />
                </g>
            )
        case 2:
            return (
                <g
                    fill="none"
                    stroke={ink}
                    strokeWidth="3"
                >
                    <rect
                        x="24"
                        y="40"
                        width="22"
                        height="19"
                        rx="3"
                    />
                    <rect
                        x="54"
                        y="40"
                        width="22"
                        height="19"
                        rx="3"
                    />
                    <path d="M46 49H54" />
                </g>
            )
        case 3:
            return (
                <g
                    fill={palette.accent}
                    stroke={ink}
                    strokeWidth="3"
                    strokeLinejoin="round"
                >
                    <path d="M49 86L35 80L36 93Z" />
                    <path d="M51 86L65 80L64 93Z" />
                    <circle
                        cx="50"
                        cy="86"
                        r="4"
                    />
                </g>
            )
        case 4:
            return (
                <path
                    d="M24 83Q50 92 76 83L73 94H27Z"
                    fill={palette.accent}
                    stroke={ink}
                    strokeWidth="3"
                />
            )
        case 5:
            return (
                <g transform={scene.tuft % 2 ? 'translate(9 7)' : 'translate(0 0)'}>
                    <path
                        d="M67 28L76 23L76 33Z"
                        fill={palette.accent}
                        stroke={ink}
                        strokeWidth="2.5"
                    />
                    <circle
                        cx="76"
                        cy="28"
                        r="3"
                        fill={palette.accent}
                        stroke={ink}
                        strokeWidth="2"
                    />
                    <path
                        d="M85 23L76 28L85 33Z"
                        fill={palette.accent}
                        stroke={ink}
                        strokeWidth="2.5"
                    />
                </g>
            )
        case 6:
            return (
                <g>
                    <path
                        d="M28 88Q50 97 72 88"
                        fill="none"
                        stroke={ink}
                        strokeWidth="4"
                    />
                    <circle
                        cx="50"
                        cy="92"
                        r="5"
                        fill={palette.accent}
                        stroke={ink}
                        strokeWidth="2.5"
                    />
                </g>
            )
        case 7:
            return (
                <path
                    d="M20 84Q50 94 80 84"
                    fill="none"
                    stroke={palette.accent}
                    strokeWidth="6"
                    strokeLinecap="round"
                />
            )
        default:
            return null
    }
}

export function PersonMonster({
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
    const scene = getPersonMonsterDescriptor(seed, version)
    const palette = monsterPalettes[scene.palette]
    return (
        <svg
            viewBox="0 0 100 100"
            width={size}
            height={size}
            aria-hidden="true"
            focusable="false"
            style={{ display: 'block', ...style }}
        >
            <Backdrop
                kind={scene.backdrop}
                color={palette.background}
            />
            <Ears
                kind={scene.ears}
                palette={palette}
            />
            <Horns
                scene={scene}
                palette={palette}
            />
            <path
                d={bodyPaths[scene.bodyShape]}
                fill={palette.body}
                stroke={ink}
                strokeWidth="4"
                strokeLinejoin="round"
            />
            <Tuft
                kind={scene.tuft}
                palette={palette}
            />
            <Markings
                kind={scene.markings}
                palette={palette}
            />
            <Eyes kind={scene.eyes} />
            <Mouth
                kind={scene.mouth}
                palette={palette}
            />
            <Accessory
                kind={scene.accessory}
                scene={scene}
                palette={palette}
            />
        </svg>
    )
}

export function PersonMonsterAvatar({ seed, version, size = 32 }: { seed: string; version?: number; size?: number }) {
    return (
        <Avatar
            aria-hidden="true"
            sx={{ width: size, height: size, bgcolor: 'transparent' }}
        >
            <PersonMonster
                seed={seed}
                version={version}
            />
        </Avatar>
    )
}
