import { Box, Button } from '@mui/material'
import React, { forwardRef, useEffect, useRef } from 'react'
import { LayersControl, MapContainer, ScaleControl, TileLayer, useMap } from 'react-leaflet'
import { LatLngBoundsExpression, LatLngExpression } from 'leaflet'
import { Cancel } from '@mui/icons-material'
import '../theme/leaflet-override.css'
import { useLayoutStore } from '../libraries/useLayoutStore'
import { ScreenshotButton } from './ScreenshotButton'
import { useMapLockedTooltipStore } from '../libraries/useMapLockedTooltipStore'

export const LeafletWrapper = forwardRef(
    (
        props: {
            origin?: LatLngExpression
            zoom?: number
            maxBounds?: LatLngBoundsExpression
            children?: React.ReactNode
            height?: number | string
            minZoom?: number
            isLoading?: boolean
            legends?: (React.ReactNode | (() => React.ReactNode))[]
        },
        ref,
    ) => {
        const {
            origin = [39.113014, -105.358887],
            zoom = 6,
            maxBounds,
            height = 300,
            minZoom,
            isLoading = false,
            children,
            legends = [],
        } = props

        const mapRef = useRef(null)

        const mapPriority = useLayoutStore((state) => state.mapPriority)
        const sidebarLeftOpen = useLayoutStore((state) => state.sidebarLeftOpen)
        const content = useMapLockedTooltipStore((state) => state.content)
        const setContent = useMapLockedTooltipStore((state) => state.setContent)

        const [isScreenshot, setIsScreenshot] = React.useState(true)

        const { BaseLayer } = LayersControl

        useEffect(() => {
            if (!mapRef.current) return

            const map = mapRef.current
            if (ref) {
                if (typeof ref === 'function') {
                    ref(map)
                } else {
                    ref.current = map
                }
            }
        }, [mapRef, ref])

        function Resizer() {
            const map = useMap()

            useEffect(() => {
                setTimeout(() => {
                    map.invalidateSize()
                }, 300)
            }, [mapPriority, sidebarLeftOpen])

            return null
        }

        const screenshotRef = useRef(null)

        const [selectedBasemap, setSelectedBasemap] = React.useState(
            'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
        )

        function IsLoading() {
            if (isLoading)
                return (
                    <Box
                        position={'absolute'}
                        left={50}
                        top={10}
                        zIndex={999}
                        bgcolor={'white'}
                        padding={1}
                    >
                        LOADING
                    </Box>
                )
            return null
        }

        return (
            <>
                <Button
                    variant={'contained'}
                    onClick={() => setIsScreenshot((prev) => !prev)}
                >
                    Switch - {isScreenshot.toString()}
                </Button>
                <Box
                    style={{ height: height, position: 'relative', overflow: 'hidden', transition: '0.3s ease height' }}
                >
                    <MapContainer
                        key={isScreenshot ? 'screenshot-mode' : 'normal-mode'}
                        ref={mapRef}
                        minZoom={minZoom}
                        center={origin}
                        zoom={zoom}
                        scrollWheelZoom={true}
                        style={{ height: '100%', width: '100%', zIndex: 0, userSelect: 'none' }}
                        maxBounds={maxBounds}
                        zoomControl={!isScreenshot}
                    >
                        <IsLoading />
                        <Resizer />
                        <Box sx={{ opacity: isScreenshot ? 0 : 1 }}>
                            <ScreenshotButton ref={screenshotRef} />
                        </Box>

                        <ScaleControl />

                        {/* <Box sx={{ opacity: isScreenshot ? 0 : 1, pointerEvents: isScreenshot ? 'none' : 'auto' }}>
                            <LayersControl position="topleft">
                                <BaseLayer
                                    checked
                                    name="OpenStreetMap"
                                >
                                    <TileLayer
                                        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                                        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                                        zIndex={0}
                                    />
                                </BaseLayer>
                                <BaseLayer name="OpenStreetMap Hot">
                                    <TileLayer
                                        url="https://{s}.tile.openstreetmap.fr/hot/{z}/{x}/{y}.png"
                                        attribution="&copy; OpenStreetMap contributors, Tiles style by Humanitarian OpenStreetMap Team hosted by OpenStreetMap France"
                                        zIndex={0}
                                    />
                                </BaseLayer>
                            </LayersControl>
                        </Box> */}

                        {/* Render selected basemap */}
                        <TileLayer
                            url={selectedBasemap}
                            attribution="&copy; OpenStreetMap contributors"
                            zIndex={0}
                        />

                        {!isScreenshot && (
                            <LayersControl position="topleft">
                                <BaseLayer
                                    checked={selectedBasemap === 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png'}
                                    name="OpenStreetMap"
                                >
                                    <TileLayer
                                        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                                        attribution="&copy; OpenStreetMap contributors"
                                        zIndex={0}
                                        eventHandlers={{
                                            add: () =>
                                                setSelectedBasemap(
                                                    'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
                                                ),
                                        }}
                                    />
                                </BaseLayer>
                                <BaseLayer
                                    checked={
                                        selectedBasemap === 'https://{s}.tile.openstreetmap.fr/hot/{z}/{x}/{y}.png'
                                    }
                                    name="OpenStreetMap Hot"
                                >
                                    <TileLayer
                                        url="https://{s}.tile.openstreetmap.fr/hot/{z}/{x}/{y}.png"
                                        attribution="&copy; OpenStreetMap contributors, Tiles style by Humanitarian OpenStreetMap Team hosted by OpenStreetMap France"
                                        zIndex={0}
                                        eventHandlers={{
                                            add: () =>
                                                setSelectedBasemap(
                                                    'https://{s}.tile.openstreetmap.fr/hot/{z}/{x}/{y}.png',
                                                ),
                                        }}
                                    />
                                </BaseLayer>
                            </LayersControl>
                        )}

                        <Box key={Date.now().toString()}>{children}</Box>
                        <Box
                            position={'absolute'}
                            left={55}
                            top={0}
                            zIndex={0}
                        >
                            {legends.length > 0 && (
                                <>
                                    {legends.map((legend, n) => (
                                        <Box key={n}>{typeof legend === 'function' ? legend() : legend}</Box>
                                    ))}
                                </>
                            )}
                        </Box>
                    </MapContainer>

                    {!!content && (
                        <Box
                            position={'absolute'}
                            left={100}
                            bottom={10}
                            zIndex={10}
                            bgcolor={'rgba(240, 240, 240, 0.9)'}
                            fontSize={'x-small'}
                            maxWidth={'80%'}
                            paddingLeft={1}
                            paddingTop={1}
                            paddingRight={4}
                            paddingBottom={1}
                            sx={{ boxShadow: '2px 2px 5px gray' }}
                        >
                            {content}
                            <Box
                                position={'absolute'}
                                right={5}
                                top={5}
                                onClick={() => setContent(undefined)}
                                sx={{ cursor: 'pointer' }}
                            >
                                <Cancel fontSize={'small'} />
                            </Box>
                        </Box>
                    )}
                </Box>
            </>
        )
    },
)
