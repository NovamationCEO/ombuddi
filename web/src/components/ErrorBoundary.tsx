import { Box } from '@mui/material'
import React, { ReactNode } from 'react'

type ErrorBoundaryProps = {
    children: ReactNode
}

type ErrorBoundaryState = {
    hasError: boolean
}

class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
    constructor(props: ErrorBoundaryProps) {
        super(props)
        this.state = {
            hasError: false,
        }
    }

    componentDidCatch(error: Error, errorInfo: React.ErrorInfo): void {
        // Handle the error (e.g., log it, show a fallback UI)
        console.error('Error caught by boundary:', error, errorInfo)
        this.setState({
            hasError: true,
        })
    }

    render(): ReactNode {
        if (this.state.hasError) {
            return <Box>Something went wrong!</Box> // Fallback UI for errors
        }

        return this.props.children
    }
}

export default ErrorBoundary
