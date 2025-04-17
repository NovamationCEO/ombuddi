import { useEffect, useRef } from 'react'
import { useLeafletContext } from '@react-leaflet/core'
import { useMap } from 'react-leaflet'
import parseGeoraster from 'georaster'
import GeoRasterLayer from 'georaster-layer-for-leaflet'
import chroma from 'chroma-js'
import { GeoTifLayerType } from '../types/mapTypes'

export function TifLayer(props: { layer: GeoTifLayerType }) {
    const { url, converter, source, opacity = 0.7 } = props.layer
    const geoTiffLayerRef = useRef()
    const context = useLeafletContext()
    const map = useMap()

    useEffect(() => {
        const container = context.layerContainer || context.map
        fetch(url, {
            mode: 'no-cors',
        })
            .then((response) => response.arrayBuffer())
            .then((arrayBuffer) => {
                parseGeoraster(arrayBuffer).then((georaster) => {
                    const min = georaster.mins[0]
                    const range = georaster.ranges[0]
                    const scale = chroma.scale('Spectral').domain([1, 0])
                    const options = {
                        pixelValuesToColorFn:
                            converter ||
                            function (pixelValues: number[]) {
                                const pixelValue = pixelValues[0]
                                if (pixelValue <= 0) return null
                                const scaledPixelValue = (pixelValue - min) / range
                                const color = scale(scaledPixelValue).hex()
                                return color
                            },
                        resolution: 256,
                        opacity: opacity,
                        georaster: undefined,
                        attribution: source,
                    }
                    options.georaster = georaster
                    if (geoTiffLayerRef.current) return
                    geoTiffLayerRef.current = new GeoRasterLayer(options)
                    container.addLayer(geoTiffLayerRef.current)
                })
            })
        return () => {
            if (geoTiffLayerRef.current && map) {
                map.removeLayer(geoTiffLayerRef.current)
            }
        }
    }, [url])

    return null
}
