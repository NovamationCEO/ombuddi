import type { CSSProperties, ReactNode } from 'react'
import { caseScenePalettes, getCaseSceneDescriptor, type CaseSceneDescriptor, type ScenePalette } from './caseScene'

function FocalSymbol({ scene, palette }: { scene: CaseSceneDescriptor; palette: ScenePalette }) {
    const { focalX: x, focalY: y } = scene
    switch (scene.focal) {
        case 0:
            return (
                <circle
                    cx={x}
                    cy={y}
                    r={9}
                    fill={palette.accent}
                />
            )
        case 1:
            return (
                <circle
                    cx={x}
                    cy={y}
                    r={10}
                    fill="none"
                    stroke={palette.accent}
                    strokeWidth={5}
                />
            )
        case 2:
            return (
                <g>
                    <circle
                        cx={x}
                        cy={y}
                        r={10}
                        fill={palette.accent}
                    />
                    <circle
                        cx={x + 5}
                        cy={y - 3}
                        r={9}
                        fill={palette.sky}
                    />
                </g>
            )
        case 3:
            return (
                <rect
                    x={x - 7}
                    y={y - 7}
                    width={14}
                    height={14}
                    rx={2}
                    fill={palette.accent}
                    transform={`rotate(45 ${x} ${y})`}
                />
            )
        case 4:
            return (
                <g>
                    <circle
                        cx={x - 5}
                        cy={y}
                        r={7}
                        fill={palette.accent}
                    />
                    <circle
                        cx={x + 6}
                        cy={y + 2}
                        r={5}
                        fill={palette.ink}
                        fillOpacity={0.9}
                    />
                </g>
            )
        default:
            return (
                <g
                    stroke={palette.accent}
                    strokeWidth={3}
                    strokeLinecap="round"
                >
                    <circle
                        cx={x}
                        cy={y}
                        r={5}
                        fill={palette.accent}
                        stroke="none"
                    />
                    <path d={`M${x} ${y - 13}v5 M${x} ${y + 8}v5 M${x - 13} ${y}h5 M${x + 8} ${y}h5`} />
                    <path
                        d={`M${x - 9} ${y - 9}l4 4 M${x + 5} ${y + 5}l4 4 M${x + 9} ${y - 9}l-4 4 M${x - 5} ${y + 5}l-4 4`}
                    />
                </g>
            )
    }
}

function Atmosphere({ scene, palette }: { scene: CaseSceneDescriptor; palette: ScenePalette }) {
    const shift = scene.detailShift
    switch (scene.atmosphere) {
        case 0:
            return (
                <g
                    fill={palette.ink}
                    fillOpacity={0.78}
                >
                    <circle
                        cx={12 + shift}
                        cy={16}
                        r={2}
                    />
                    <circle
                        cx={43 + shift / 2}
                        cy={11 + shift / 3}
                        r={1.5}
                    />
                    <circle
                        cx={77 - shift / 2}
                        cy={27}
                        r={2.4}
                    />
                </g>
            )
        case 1:
            return (
                <g
                    fill="none"
                    stroke={palette.ink}
                    strokeOpacity={0.68}
                    strokeWidth={3}
                    strokeLinecap="round"
                >
                    <path d={`M${8 + shift} 23q7-8 14 0q7-8 14 0`} />
                    <path d={`M${56 - shift / 2} 14q5-6 10 0q5-6 10 0`} />
                </g>
            )
        case 2:
            return (
                <g
                    stroke={palette.ink}
                    strokeOpacity={0.55}
                    strokeWidth={2.5}
                    strokeLinecap="round"
                >
                    <path
                        d={`M${10 + shift} 12l-5 9 M${27 + shift} 15l-5 9 M${48 + shift / 2} 10l-5 9 M${76 - shift} 16l-5 9`}
                    />
                </g>
            )
        case 3:
            return (
                <g
                    fill={palette.ink}
                    fillOpacity={0.72}
                >
                    <rect
                        x={10 + shift}
                        y={14}
                        width={13}
                        height={3}
                        rx={1.5}
                    />
                    <rect
                        x={45 - shift / 2}
                        y={24}
                        width={20}
                        height={3}
                        rx={1.5}
                    />
                    <rect
                        x={70 - shift / 3}
                        y={9}
                        width={11}
                        height={3}
                        rx={1.5}
                    />
                </g>
            )
        case 4:
            return (
                <g
                    fill={palette.ink}
                    fillOpacity={0.7}
                >
                    <path d={`M${12 + shift} 18l3 3-3 3-3-3z`} />
                    <path d={`M${47 + shift / 2} 12l4 4-4 4-4-4z`} />
                    <path d={`M${76 - shift / 2} 29l2.5 2.5-2.5 2.5-2.5-2.5z`} />
                </g>
            )
        default:
            return (
                <g
                    fill="none"
                    stroke={palette.ink}
                    strokeOpacity={0.62}
                    strokeWidth={2.5}
                >
                    <circle
                        cx={20 + shift}
                        cy={20}
                        r={4}
                    />
                    <circle
                        cx={53}
                        cy={13 + shift / 2}
                        r={2.5}
                    />
                    <path d={`M${20 + shift} 20L53 ${13 + shift / 2}L${79 - shift} 27`} />
                </g>
            )
    }
}

function Terrain({ scene, palette }: { scene: CaseSceneDescriptor; palette: ScenePalette }) {
    const { horizon, ridgeA, ridgeB, detailShift: shift } = scene
    const commonForeground = (
        <rect
            x={0}
            y={horizon + 22}
            width={96}
            height={30}
            fill={palette.front}
        />
    )
    let layers: ReactNode

    switch (scene.terrain) {
        case 0:
            layers = (
                <>
                    <path
                        d={`M0 ${horizon + 11}L20 ${ridgeA}L39 ${horizon + 8}L60 ${ridgeB}L96 ${horizon + 12}V96H0Z`}
                        fill={palette.back}
                    />
                    <path
                        d={`M0 ${horizon + 22}L18 ${horizon + 5}L38 ${horizon + 18}L61 ${horizon - 2}L96 ${horizon + 23}V96H0Z`}
                        fill={palette.front}
                    />
                </>
            )
            break
        case 1:
            layers = (
                <>
                    <path
                        d={`M0 ${horizon}Q18 ${horizon - 14} 36 ${horizon}T72 ${horizon}T108 ${horizon}V96H0Z`}
                        fill={palette.back}
                    />
                    <path
                        d={`M0 ${horizon + 17}Q15 ${horizon + 4} 30 ${horizon + 17}T60 ${horizon + 17}T90 ${horizon + 17}T120 ${horizon + 17}V96H0Z`}
                        fill={palette.front}
                    />
                    <path
                        d={`M0 ${horizon + 28}Q12 ${horizon + 20} 24 ${horizon + 28}T48 ${horizon + 28}T72 ${horizon + 28}T96 ${horizon + 28}`}
                        fill="none"
                        stroke={palette.accent}
                        strokeWidth={3}
                        strokeOpacity={0.78}
                    />
                </>
            )
            break
        case 2:
            layers = (
                <>
                    <path
                        d={`M0 ${horizon + 4}C20 ${horizon - 13} 38 ${horizon + 14} 58 ${horizon - 2}C72 ${horizon - 13} 84 ${horizon - 2} 96 ${horizon + 4}V96H0Z`}
                        fill={palette.back}
                    />
                    <path
                        d={`M0 ${horizon + 25}C25 ${horizon + 5} 43 ${horizon + 31} 70 ${horizon + 13}C81 ${horizon + 6} 90 ${horizon + 11} 96 ${horizon + 16}V96H0Z`}
                        fill={palette.front}
                    />
                </>
            )
            break
        case 3:
            layers = (
                <>
                    <path
                        d={`M0 ${horizon + 7}V${ridgeA}H${17 + shift}V${horizon + 16}H${35 + shift / 2}V${ridgeB}H${55 + shift / 2}V${horizon + 12}H${77 + shift / 3}V${ridgeA + 4}H96V96H0Z`}
                        fill={palette.back}
                    />
                    <path
                        d={`M0 ${horizon + 26}L26 ${horizon + 13}L46 ${horizon + 24}L69 ${horizon + 8}L96 ${horizon + 23}V96H0Z`}
                        fill={palette.front}
                    />
                </>
            )
            break
        case 4:
            layers = (
                <>
                    <path
                        d={`M0 ${horizon + 13}Q${17 + shift} ${horizon - 6} ${34 + shift} ${horizon + 13}T${82 + shift / 2} ${horizon + 13}T120 ${horizon + 13}V96H0Z`}
                        fill={palette.back}
                    />
                    <path
                        d={`M0 ${horizon + 30}Q20 ${horizon + 12} 39 ${horizon + 30}Q66 ${horizon + 8} 96 ${horizon + 27}V96H0Z`}
                        fill={palette.front}
                    />
                </>
            )
            break
        case 5:
            layers = (
                <>
                    <path
                        d={`M0 ${horizon + 15}H${17 + shift}V${horizon + 5}H${39 + shift}V${horizon - 7}H${61 + shift / 2}V${horizon + 8}H${80 + shift / 2}V${horizon + 1}H96V96H0Z`}
                        fill={palette.back}
                    />
                    <path
                        d={`M0 ${horizon + 27}H24V${horizon + 20}H49V${horizon + 12}H71V${horizon + 24}H96V96H0Z`}
                        fill={palette.front}
                    />
                </>
            )
            break
        default:
            layers = (
                <>
                    <path
                        d={`M0 ${ridgeA}L30 ${horizon + 11}L48 ${horizon - 2}L67 ${horizon + 11}L96 ${ridgeB}V96H0Z`}
                        fill={palette.back}
                    />
                    <path
                        d={`M0 ${horizon + 8}L34 ${horizon + 25}L48 ${horizon + 13}L62 ${horizon + 25}L96 ${horizon + 8}V96H0Z`}
                        fill={palette.front}
                    />
                </>
            )
    }

    return (
        <g>
            {layers}
            {scene.terrain === 1 ? null : commonForeground}
        </g>
    )
}

function Landmark({ scene, palette }: { scene: CaseSceneDescriptor; palette: ScenePalette }) {
    const x = scene.landmarkX
    const y = Math.min(83, scene.horizon + 24)
    switch (scene.landmark) {
        case 0:
            return (
                <g fill={palette.ink}>
                    <ellipse
                        cx={x}
                        cy={y}
                        rx={10}
                        ry={4}
                    />
                    <ellipse
                        cx={x}
                        cy={y - 6}
                        rx={7}
                        ry={4}
                    />
                    <ellipse
                        cx={x}
                        cy={y - 12}
                        rx={4}
                        ry={3.5}
                    />
                </g>
            )
        case 1:
            return (
                <path
                    d={`M${x - 12} ${y}V${y - 19}Q${x} ${y - 34} ${x + 12} ${y - 19}V${y}H${x + 6}V${y - 18}Q${x} ${y - 26} ${x - 6} ${y - 18}V${y}Z`}
                    fill={palette.ink}
                />
            )
        case 2:
            return (
                <g
                    fill={palette.ink}
                    stroke={palette.ink}
                    strokeLinecap="round"
                >
                    <path
                        d={`M${x} ${y}V${y - 24}`}
                        strokeWidth={5}
                    />
                    <circle
                        cx={x}
                        cy={y - 28}
                        r={9}
                        stroke="none"
                    />
                    <circle
                        cx={x - 7}
                        cy={y - 22}
                        r={6}
                        stroke="none"
                    />
                    <circle
                        cx={x + 7}
                        cy={y - 21}
                        r={6}
                        stroke="none"
                    />
                </g>
            )
        case 3:
            return (
                <g fill={palette.ink}>
                    <rect
                        x={x - 12}
                        y={y - 25}
                        width={8}
                        height={25}
                        rx={2}
                    />
                    <rect
                        x={x + 4}
                        y={y - 34}
                        width={8}
                        height={34}
                        rx={2}
                    />
                    <rect
                        x={x - 15}
                        y={y - 28}
                        width={14}
                        height={4}
                        rx={2}
                    />
                    <rect
                        x={x + 1}
                        y={y - 37}
                        width={14}
                        height={4}
                        rx={2}
                    />
                </g>
            )
        case 4:
            return (
                <g>
                    <path
                        d={`M${x - 8} ${y}L${x - 4} ${y - 27}H${x + 4}L${x + 8} ${y}Z`}
                        fill={palette.ink}
                    />
                    <circle
                        cx={x}
                        cy={y - 31}
                        r={6}
                        fill={palette.accent}
                    />
                    <path
                        d={`M${x - 14} ${y - 31}H${x - 8}M${x + 8} ${y - 31}H${x + 14}`}
                        stroke={palette.accent}
                        strokeWidth={3}
                        strokeLinecap="round"
                    />
                </g>
            )
        case 5:
            return (
                <g
                    fill="none"
                    stroke={palette.ink}
                    strokeWidth={5}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                >
                    <path d={`M${x - 19} ${y}V${y - 11}Q${x} ${y - 28} ${x + 19} ${y - 11}V${y}`} />
                    <path
                        d={`M${x - 19} ${y - 9}H${x + 19}`}
                        strokeWidth={3}
                    />
                </g>
            )
        case 6:
            return (
                <g
                    fill="none"
                    stroke={palette.ink}
                    strokeWidth={3}
                    strokeLinecap="round"
                >
                    <path
                        d={`M${x - 12} ${y}Q${x - 17} ${y - 16} ${x - 10} ${y - 28}M${x - 3} ${y}Q${x - 8} ${y - 22} ${x} ${y - 37}M${x + 6} ${y}Q${x + 14} ${y - 18} ${x + 8} ${y - 31}M${x + 14} ${y}Q${x + 20} ${y - 13} ${x + 17} ${y - 23}`}
                    />
                </g>
            )
        default:
            return (
                <g fill={palette.ink}>
                    <circle
                        cx={x - 10}
                        cy={y - 5}
                        r={8}
                    />
                    <circle
                        cx={x + 2}
                        cy={y - 8}
                        r={11}
                    />
                    <circle
                        cx={x + 14}
                        cy={y - 4}
                        r={7}
                    />
                </g>
            )
    }
}

export function CaseSceneThumbnail({
    seed,
    label,
    className,
    style,
}: {
    seed: string
    label?: string
    className?: string
    style?: CSSProperties
}) {
    const scene = getCaseSceneDescriptor(seed)
    const palette = caseScenePalettes[scene.palette]
    const accessible = Boolean(label)

    return (
        <svg
            viewBox="0 0 96 96"
            preserveAspectRatio="xMidYMid slice"
            role={accessible ? 'img' : undefined}
            aria-label={label}
            aria-hidden={accessible ? undefined : true}
            focusable="false"
            className={className}
            style={{ width: '100%', height: '100%', display: 'block', ...style }}
        >
            <rect
                width={96}
                height={96}
                fill={palette.sky}
            />
            <rect
                y={30}
                width={96}
                height={45}
                fill={palette.haze}
                fillOpacity={0.5}
            />
            <Atmosphere
                scene={scene}
                palette={palette}
            />
            <FocalSymbol
                scene={scene}
                palette={palette}
            />
            <Terrain
                scene={scene}
                palette={palette}
            />
            <Landmark
                scene={scene}
                palette={palette}
            />
            <path
                d="M7 88H89"
                stroke={palette.ink}
                strokeOpacity={0.34}
                strokeWidth={2}
                strokeLinecap="round"
            />
        </svg>
    )
}
