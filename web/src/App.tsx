import React from 'react'
import { RouterProvider } from 'react-router-dom'
import { router } from './router'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ReactQueryDevtools } from '@tanstack/react-query-devtools'
import { Auth0Provider, useAuth0 } from '@auth0/auth0-react'
import { auth0Domain, auth0ClientId, auth0Audience } from './constants/auth0Config'
import { initTokenGetter } from './tools/auth/tokenProvider'
import { showDevtools } from './constants/showDevtools'
import { Snack } from './trusted-components/Snack'
import { Background } from './trusted-components/Background'
import { Box, CssBaseline, ThemeProvider, SxProps } from '@mui/material'
import { Theme } from '@mui/material/styles'
import { useSnack } from './libraries/useSnack'
import { appTheme, colorSchemeStorageKey } from './theme/appTheme'

const App: React.FC = () => {
    return (
        <Auth0Provider
            domain={auth0Domain}
            clientId={auth0ClientId}
            authorizationParams={{
                redirect_uri: window.location.origin + '/',
                audience: auth0Audience,
            }}
            onRedirectCallback={(appState) => {
                const requestedPath = appState?.returnTo
                const returnTo = typeof requestedPath === 'string' && requestedPath.startsWith('/')
                    ? requestedPath
                    : '/'
                window.history.replaceState({}, document.title, returnTo)
            }}
        >
            <QueryWrap />
        </Auth0Provider>
    )
}

const QueryWrap: React.FC = () => {
    const queryClient = new QueryClient()

    return (
        <React.StrictMode>
            <QueryClientProvider client={queryClient}>
                {showDevtools && <ReactQueryDevtools initialIsOpen={false} />}
                <InnerApp />
            </QueryClientProvider>
        </React.StrictMode>
    );
}

const outerBoxStyle: SxProps<Theme> = {
    display: 'flex',
    flexDirection: 'column',
    position: 'relative',
    boxSizing: 'border-box',
    overflow: 'hidden',
}

const innerBoxStyle: SxProps<Theme> = {
    flexDirection: 'column',
    position: 'relative',
    flex: 1,
}

const InnerApp: React.FC = () => {
    const snack = useSnack((state) => state.snack)
    const { getAccessTokenSilently } = useAuth0()

    React.useEffect(() => {
        initTokenGetter(getAccessTokenSilently)
    }, [getAccessTokenSilently])

    return (
        <ThemeProvider
            theme={appTheme}
            defaultMode="dark"
            modeStorageKey={colorSchemeStorageKey}
            disableTransitionOnChange
        >
            <CssBaseline />
            <Snack snack={snack} />
            <Box sx={outerBoxStyle}>
                <Background />
                <Box sx={innerBoxStyle}>
                    <RouterProvider router={router} />
                </Box>
            </Box>
        </ThemeProvider>
    )
}

export default App
