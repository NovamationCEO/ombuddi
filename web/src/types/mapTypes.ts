import { Feature, GeoJsonObject, Geometry } from 'geojson'
import { PathOptions } from 'leaflet'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type FeatureType = Feature<Geometry, any>

export type GeoJsonLayerType = {
    id: string
    layer: GeoJsonObject
    title: string
    style?: PathOptions | ((feature) => PathOptions)
    tooltip?: (feature: FeatureType) => React.ReactNode
    source?: string
    legend?: React.ReactNode | (() => React.ReactNode)
    visibilityKey?: string
}

export type GeoTifLayerType = {
    url: string
    id: string
    title: string
    converter?: (pixelValues: number[]) => string
    source?: string
    legend?: React.ReactNode | (() => React.ReactNode)
    opacity?: number
    visibilityKey?: string
}

export type GeoLayerType = GeoJsonLayerType | GeoTifLayerType

export type MapProps = {
    height?: string | number
    title?: string
}

export type GeoJsonImportType = { file_content: string; success: boolean; status?: string; message?: string }
