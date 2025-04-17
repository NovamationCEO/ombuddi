import { GeoLayerType } from '../types/mapTypes'
import { GeoJsonLayer } from './GeoJsonLayer'
import { TifLayer } from './TifLayer'

export function MapLayer(props: { layer: GeoLayerType }) {
    const { layer } = props

    if ('url' in layer) {
        return <TifLayer layer={layer} />
    }
    return <GeoJsonLayer layer={layer} />
}
