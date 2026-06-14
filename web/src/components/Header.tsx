import { Box, Stack } from '@mui/system'
import { useStyles } from '../tools/useStyles'
import { Typography } from '@mui/material'
import { useNavigate } from 'react-router-dom'
import { zIndex } from '../constants/zIndex'
import { AccountButton } from './AccountButton'
import { headerHeight } from '../constants/uiSizes'
export function Header() {
    // const { setTheme } = useThemingContext()
    // const setThemeName = useLayoutStore((state) => state.setThemeName)
    // const themeName = useLayoutStore((state) => state.themeName)
    const navigate = useNavigate()

    // function toggleTheme() {
    //     if (themeName === 'light') {
    //         setThemeName('dark')
    //         setTheme(themes.dark.theme)
    //         return
    //     }
    //     setThemeName('light')
    //     setTheme(themes.light.theme)
    // }

    const style = useStyles()

    return (
        <Box
            sx={{
                ...style.header,
                padding: 1,
                height: `${headerHeight}px`,
                textAlign: 'center',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 'large',
                position: 'fixed',
                left: 0,
                right: 0,
                top: 0,
                zIndex: zIndex.header,
                transition: '0.2s ease all',
                userSelect: 'none'
            }}>
            {/* <Box>
                <RoundButton onClick={toggleTheme}>
                    {themeName === 'light' ? <FlashlightOff /> : <FlashlightOn />}
                </RoundButton>
            </Box> */}
            <Box
                onClick={() => navigate('/')}
                sx={{
                    flex: 1,
                    cursor: 'pointer'
                }}>
                <Typography
                    variant={'h6'}
                    sx={{
                        fontWeight: 'bold'
                    }}
                >
                    OMBUDDI
                </Typography>
            </Box>
            <Stack
                spacing={2}
                direction={'row'}
            >
                <AccountButton />
            </Stack>
        </Box>
    );
}
