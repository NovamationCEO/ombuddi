declare module '*.geojson' {
    const value: GeoJSON.FeatureCollection<GeoJSON.Geometry>
    export default value
}
