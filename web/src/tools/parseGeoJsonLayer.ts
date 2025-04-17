import { FeatureCollection } from 'geojson'
import { GeoJsonImportType } from '../types/mapTypes'

export function parseGeoJsonLayer(geo?: GeoJsonImportType) {
    if (!geo || !geo.success) return undefined
    return JSON.parse(geo.file_content) as FeatureCollection
}
