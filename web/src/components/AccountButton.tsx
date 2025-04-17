import { Person } from '@mui/icons-material'
import { Popper, Grow, Paper, ClickAwayListener, MenuList, MenuItem, CircularProgress } from '@mui/material'
import { Box } from '@mui/system'
// import { useKeycloak } from '@react-keycloak/web'
import React from 'react'
import { useNavigate } from 'react-router-dom'
import { RoundButton } from '../trusted-components/RoundButton'
import { zIndex } from '../constants/zIndex'

export function AccountButton() {
    const [anchorEl, setAnchorEl] = React.useState<HTMLButtonElement | null>(null)

    const navigate = useNavigate()
    // const { keycloak, initialized } = useKeycloak()
    // const isLoggedIn = keycloak.authenticated || false
    // const userId = keycloak?.idTokenParsed?.sub

    const open = Boolean(anchorEl)

    const handleClick = (event: React.MouseEvent<HTMLButtonElement>) => {
        setAnchorEl(event.currentTarget)
    }

    const handleClose = () => {
        setAnchorEl(null)
    }

    // if (!initialized) return <CircularProgress />

    return (
        <>
            <RoundButton onClick={handleClick}>
                <Person />
            </RoundButton>
            <Popper
                open={open}
                anchorEl={anchorEl}
                role={undefined}
                placement="bottom-end"
                transition
                disablePortal
                onClick={handleClose}
            >
                {({ TransitionProps }) => (
                    <Grow
                        {...TransitionProps}
                        style={{
                            transformOrigin: 'right top',
                        }}
                    >
                        <Paper>
                            <ClickAwayListener onClickAway={handleClose}>
                                <Box zIndex={zIndex.popper}>
                                    <MenuList
                                        autoFocusItem={open}
                                        id="composition-menu"
                                        aria-labelledby="composition-button"
                                    >
                                        {!isLoggedIn && <MenuItem onClick={() => keycloak.login()}>Log In</MenuItem>}
                                        {isLoggedIn && (
                                            <>
                                                <MenuItem onClick={() => navigate(`/profile/${userId}`)}>
                                                    Profile
                                                </MenuItem>
                                                <MenuItem
                                                    onClick={() => {
                                                        navigate('/')
                                                        keycloak.logout()
                                                    }}
                                                >
                                                    Logout
                                                </MenuItem>
                                            </>
                                        )}
                                    </MenuList>
                                </Box>
                            </ClickAwayListener>
                        </Paper>
                    </Grow>
                )}
            </Popper>
        </>
    )
}
