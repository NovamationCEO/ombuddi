import { forwardRef, useImperativeHandle } from 'react'
import { toPng } from 'html-to-image'
import { RoundButton } from './RoundButton'
import { Camera } from '@mui/icons-material'
import { Box } from '@mui/material'

export const ScreenshotButton = forwardRef((_, ref) => {
    const captureScreenshot = () => {
        const mapContainer = document.querySelector('.leaflet-container')
        if (!mapContainer) return

        toPng(mapContainer as HTMLElement)
            .then((dataUrl) => {
                const img = new Image()
                img.src = dataUrl
                img.onload = () => {
                    const canvas = document.createElement('canvas')
                    canvas.width = img.width
                    canvas.height = img.height
                    const ctx = canvas.getContext('2d')

                    ctx.drawImage(img, 0, 0)

                    const finalImage = canvas.toDataURL()
                    downloadImage(finalImage, 'MapScreenshot.png')
                }
            })
            .catch((err) => console.error('Screenshot failed', err))
    }

    // ✅ Expose captureScreenshot to the parent via ref
    useImperativeHandle(ref, () => ({
        triggerScreenshot: () => captureScreenshot(),
    }))

    return (
        <Box
            style={{
                position: 'absolute',
                bottom: 30,
                right: 10,
            }}
        >
            <RoundButton
                onClick={captureScreenshot}
                size={11}
            >
                <Camera />
            </RoundButton>
        </Box>
    )
})

// Utility function to download the image
const downloadImage = (dataUrl: string, filename: string) => {
    const link = document.createElement('a')
    link.href = dataUrl
    link.download = filename
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
}
