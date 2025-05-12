import { useStyles } from '../tools/useStyles'
import { Header } from './Header'

import { SidebarLeft } from '../trusted-components/SidebarLeft'
import { NavigationMenu } from './NavigationMenu'
import { Box } from '@mui/material'
import { headerHeight } from '../constants/uiSizes'
// import { useKeycloak } from '@react-keycloak/web'
// import { useNavigate } from 'react-router'
// import React from 'react'

export function Page(props: { element: JSX.Element }) {
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
            width={'100vw'}
            height={'100vh'}
            position={'relative'}
            display={'flex'}
            flexDirection={'column'}
            color={style.contrast}
        >
            <Header />
            <Box
                height={`calc(100% - ${headerHeight}px)`}
                flex={1}
                position={'relative'}
                display={'flex'}
            >
                {/* <SidebarLeft>
                    <NavigationMenu />
                </SidebarLeft> */}
                <Box
                    flex={1}
                    display={'flex'}
                    flexDirection={'column'}
                >
                    {/* <SidebarTop /> */}

                    <Box
                        flex={1}
                        {...style.mainContainer}
                        marginTop={`${headerHeight + 20}px`}
                        overflow={'auto'}
                    >
                        {props.element}
                    </Box>
                    {/* <SidebarBottom></SidebarBottom> */}
                </Box>
                {/* <SidebarRight></SidebarRight> */}
            </Box>
        </Box>
    )
}
