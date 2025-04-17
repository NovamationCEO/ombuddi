import fs from 'fs'
import path from 'path'

// Function to update proj4-fully-loaded version in a module's package.json
function updateProj4Version(modulePath) {
    const packageJsonPath = path.join(modulePath, 'package.json')

    if (fs.existsSync(packageJsonPath)) {
        const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'))

        if (packageJson.dependencies && packageJson.dependencies['proj4-fully-loaded']) {
            packageJson.dependencies['proj4-fully-loaded'] = '^0.2.0'
            fs.writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2), 'utf8')
            console.info(`Updated proj4-fully-loaded version in ${packageJsonPath}`)
        }
    } else {
        console.info(`package.json not found in ${modulePath}`)
    }
}

function main() {
    const modulesToPatch = [
        'node_modules/georaster-layer-for-leaflet',
        'node_modules/geocanvas',
        'node_modules/reproject-bbox',
        'node_modules/reproject-geojson',
    ]

    modulesToPatch.forEach((modulePath) => {
        updateProj4Version(modulePath)
    })
}

main()
