import React from 'react'


const defaultDescription = 'Secure, purpose-built case management and reporting software for organizational ombuds.'

function metaElement(name: string) {
    let element = document.head.querySelector<HTMLMetaElement>(`meta[name="${name}"]`)
    if (!element) {
        element = document.createElement('meta')
        element.name = name
        document.head.appendChild(element)
    }
    return element
}

export function PageMetadata(props: {
    title: string
    description?: string
    indexable?: boolean
    canonicalPath?: string
}) {
    const {
        title,
        description = defaultDescription,
        indexable = false,
        canonicalPath,
    } = props

    React.useEffect(() => {
        document.title = title === 'Ombuddi' ? title : `${title} | Ombuddi`
        metaElement('description').content = description
        metaElement('robots').content = indexable ? 'index, follow' : 'noindex, nofollow'

        const existingCanonical = document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]')
        if (indexable && canonicalPath) {
            const canonical = existingCanonical ?? document.createElement('link')
            canonical.rel = 'canonical'
            canonical.href = new URL(canonicalPath, window.location.origin).href
            if (!existingCanonical) document.head.appendChild(canonical)
        } else {
            existingCanonical?.remove()
        }
    }, [canonicalPath, description, indexable, title])

    return null
}
