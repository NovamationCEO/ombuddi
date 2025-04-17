/* eslint-disable @typescript-eslint/no-explicit-any */
import { GeoJSON } from 'react-leaflet'
import L, { Content, LatLngExpression, Layer } from 'leaflet'
import type { Feature, Geometry } from 'geojson'
import { FeatureType, GeoJsonLayerType } from '../types/mapTypes'
import ReactDOMServer from 'react-dom/server'
import { useMapLockedTooltipStore } from '../libraries/useMapLockedTooltipStore'

export function GeoJsonLayer(props: { layer: GeoJsonLayerType }) {
    const { layer: propLayer } = props
    const setContent = useMapLockedTooltipStore((state) => state.setContent)

    function onEachFeature(
        feature: FeatureType,
        layer: Layer,
        tooltip: (feature: Feature<Geometry, any>) => React.ReactNode,
    ) {
        if (!tooltip) return

        const popupContent = ReactDOMServer.renderToStaticMarkup(tooltip(feature)) as Content
        const popup = L.popup({ autoPan: false, content: popupContent })

        layer.on('mouseover', (e: { latlng: LatLngExpression }) => {
            layer.bindPopup(popup).openPopup(e.latlng)
        })
        layer.on('mousemove', (e: { latlng: LatLngExpression }) => {
            layer.getPopup().setLatLng(e.latlng)
        })
        layer.on('mouseout', () => {
            layer.closePopup()
        })
        layer.on('click', () => {
            setContent(tooltip(feature))
        })
    }

    const defaultIcon = L.icon({
        iconUrl: '/assets/icons/pin.svg', // Path to your marker icon image
        shadowUrl: '/assets/icons/pin_shadow.svg', // Path to your marker shadow image
        iconSize: [25, 25], // size of the icon
        iconAnchor: [12.5, 25], // point of the icon which will correspond to marker's location
        popupAnchor: [1, -25], // point from which the popup should open relative to the iconAnchor
        shadowSize: [27, 25], // size of the shadow
    })

    return (
        <GeoJSON
            onEachFeature={(feature, layer) => onEachFeature(feature, layer, propLayer.tooltip)}
            data={propLayer.layer}
            style={propLayer.style}
            attribution={propLayer.source?.length ? '&copy; ' + propLayer.source : undefined}
            pointToLayer={(_feature, latlng) => {
                return L.marker(latlng, { icon: defaultIcon })
            }}
        />
    )
}
