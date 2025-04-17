import { LatLngExpression } from 'leaflet'
import { Marker, Popup } from 'react-leaflet'

export function LeafMark(props: { position: LatLngExpression | [number, number]; children: React.ReactNode }) {
    const { position, children } = props

    return (
        <Marker position={position}>
            <Popup>{children}</Popup>
        </Marker>
    )
}
