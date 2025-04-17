import { BadPage } from './BadPage'
import ErrorBoundary from './ErrorBoundary'

export function ErrorElement() {
    return (
        <ErrorBoundary>
            <BadPage />
        </ErrorBoundary>
    )
}
