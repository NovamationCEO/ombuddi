import { useStyles } from '../tools/useStyles'
import { Header } from './Header'
import type { ReactNode } from 'react'

import { Box } from '@mui/material'
import { headerHeight } from '../constants/uiSizes'
// import { useKeycloak } from '@react-keycloak/web'
// import { useNavigate } from 'react-router'
// import React from 'react'

export function Page(props: { element: ReactNode }) {
    const style = useStyles()

    // const { keycloak } = useKeycloak()
    // const navigate = useNavigate()

    // const userId = keycloak?.idTokenParsed?.sub

    // React.useEffect(() => {
    //     if (!keycloak) {
    //         return
    //     }
    //     if (!keycloak.authenticated) {
    //         navigate('/welcome')
    //     }
    // }, [keycloak])

    return (
        <Box
            sx={{
                width: '100vw',
                height: '100vh',
                position: 'relative',
                display: 'flex',
                flexDirection: 'column',
                color: style.contrast
            }}>
            <Header />
            <Box
                sx={{
                    height: `calc(100% - ${headerHeight}px)`,
                    flex: 1,
                    position: 'relative',
                    display: 'flex'
                }}>
                {/* <SidebarLeft>
                    <NavigationMenu />
                </SidebarLeft> */}
                <Box
                    sx={{
                        flex: 1,
                        display: 'flex',
                        flexDirection: 'column'
                    }}>
                    {/* <SidebarTop /> */}

                    <Box
                        {...style.mainContainer}
                        sx={{
                            flex: 1,
                            marginTop: `${headerHeight + 20}px`,
                            overflow: 'auto'
                        }}>
                        {props.element}
                    </Box>
                    {/* <SidebarBottom></SidebarBottom> */}
                </Box>
                {/* <SidebarRight></SidebarRight> */}
            </Box>
        </Box>
    );
}
