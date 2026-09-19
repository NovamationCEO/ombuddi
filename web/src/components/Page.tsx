import type { ReactNode } from 'react'
import { PageMetadata } from './PageMetadata'

export function Page(props: { element: ReactNode; title: string; description?: string }) {
    return (
        <>
            <PageMetadata
                title={props.title}
                description={props.description}
            />
            {props.element}
        </>
    )
}
