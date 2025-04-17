import { FeatureCollection, Geometry } from 'geojson'
import { MapLegend } from './MapLegend'
import chroma, { Color } from 'chroma-js'
import { jenkies } from '../tools/jenkies'

export function MapNaturalBreaks(props: {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    featCollection: FeatureCollection<Geometry, { [name: string]: any }> & { filename: string }
    title: string
    chromaVal: string | Color
    parameter: string | string[]
    reverse?: boolean
    minValidValue?: number
    formatter?: (n: number) => number | string
    positiveOnlyResults?: boolean
    buffer?: number
    shape?: 'area' | 'point' | 'line'
}) {
    const {
        featCollection,
        title,
        chromaVal,
        parameter,
        reverse,
        formatter = (n) => n,
        minValidValue,
        buffer = 0.1,
        positiveOnlyResults = false,
        shape = 'area',
    } = props

    if (!featCollection) return null

    const parameters = Array.isArray(parameter) ? parameter : [parameter]

    const values: number[] = parameters
        .flatMap((para) => featCollection.features.map((feat) => feat.properties[para]))
        .filter((n) => !isNaN(Number(n)))
        .filter(Boolean)
        .map((n) => Number(n))
        .filter((n) => (minValidValue === undefined ? true : n >= minValidValue))

    if (!values.length) {
        return (
            <MapLegend
                title={title}
                pairs={{ 'No Data': '#CCCCCC' }}
                shape={shape}
            />
        )
    }

    const { classCount, breaks } = jenkies(values, buffer, positiveOnlyResults)

    if (!breaks) return null

    const pairs = {}
    const spectrumRaw = chroma.scale(chromaVal).colors(classCount)
    const spectrum = reverse ? spectrumRaw.reverse() : spectrumRaw

    breaks.forEach((val, n) => {
        if (n < breaks.length - 1) {
            const k = formatter(val) + ' - ' + formatter(breaks[n + 1])
            pairs[k] = spectrum[n]
        }
    })

    return (
        <MapLegend
            title={title}
            pairs={pairs}
            shape={shape}
        />
    )
}
