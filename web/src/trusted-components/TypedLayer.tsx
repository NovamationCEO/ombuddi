import { GeoLayerType } from '../types/mapTypes'
import { TifLayer } from './TifLayer'
import { GeoJsonLayer } from './GeoJsonLayer'

export function TypedLayer(props: { layer: GeoLayerType }) {
    const { layer } = props
    if (!layer) return null
    if ('url' in layer) {
        if (!layer.url || !layer.url.length) return null
        return <TifLayer layer={layer} />
    }
    return <GeoJsonLayer layer={layer} />
}
