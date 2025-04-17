import { GeoLayerType } from '../types/mapTypes'
import { LayerGroup, LayersControl } from 'react-leaflet'
import { useMapLayerStore } from '../libraries/useMapLayerStore'
import { MapLayer } from './MapLayer'

export function CentrallyToggledMapLayer(props: { layer: GeoLayerType }) {
    const { layer } = props
    const layerVisibility = useMapLayerStore((state) => state.layerVisibility)
    const setLayerVisibility = useMapLayerStore((state) => state.setLayerVisibility)

    function safeToggle(layer: GeoLayerType, newVisibility: boolean) {
        if (!layer.visibilityKey) {
            console.error('Visibility Key not found for layer ' + layer.id + '.')
            return
        }
        setLayerVisibility({ ...layerVisibility, [layer.visibilityKey]: newVisibility })
    }

    return (
        <LayersControl.Overlay
            checked={layerVisibility[layer.visibilityKey]}
            name={layer.title}
            key={layer.id}
        >
            <LayerGroup
                eventHandlers={{
                    add: () => safeToggle(layer, true),
                    remove: () => safeToggle(layer, false),
                }}
            >
                <MapLayer layer={layer} />
            </LayerGroup>
        </LayersControl.Overlay>
    )
}
