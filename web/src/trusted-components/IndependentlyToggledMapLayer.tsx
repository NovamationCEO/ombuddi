import { GeoLayerType } from '../types/mapTypes'
import React from 'react'
import { LayerGroup, LayersControl } from 'react-leaflet'
import { MapLayer } from './MapLayer'

export function IndependentlyToggledMapLayer(props: { layer: GeoLayerType; defaultChecked?: boolean }) {
    const { layer, defaultChecked = true } = props
    const [isChecked, setIsChecked] = React.useState(defaultChecked)

    return (
        <LayersControl.Overlay
            checked={isChecked}
            name={layer.title}
            key={layer.id}
        >
            <LayerGroup
                eventHandlers={{
                    add: () => setIsChecked(true),
                    remove: () => setIsChecked(false),
                }}
            >
                <MapLayer layer={layer} />
            </LayerGroup>
        </LayersControl.Overlay>
    )
}
