import { Person } from '@mui/icons-material'
import { Popper, Grow, Paper, ClickAwayListener, MenuList, MenuItem } from '@mui/material'
import type { PopperPlacementType } from '@mui/material'
import { Box } from '@mui/system'
import { useAuth0 } from '@auth0/auth0-react'
import React from 'react'
import { RoundButton } from '../trusted-components/RoundButton'
import { zIndex } from '../constants/zIndex'
import { useSessionSalt } from '../libraries/useSessionSalt'

export function AccountButton({ placement = 'bottom-end' }: { placement?: PopperPlacementType }) {
    const [anchorEl, setAnchorEl] = React.useState<HTMLButtonElement | null>(null)
    const { isAuthenticated, loginWithRedirect, logout } = useAuth0()
    const clearSessionSalt = useSessionSalt((state) => state.clearSessionSalt)

    const open = Boolean(anchorEl)

    const handleClick = (event: React.MouseEvent<HTMLButtonElement>) => {
        setAnchorEl(event.currentTarget)
    }

    const handleClose = () => {
        setAnchorEl(null)
    }

    const handleLogin = () => {
        clearSessionSalt()
        void loginWithRedirect()
    }

    const handleLogout = () => {
        clearSessionSalt()
        void logout({ logoutParams: { returnTo: window.location.origin } })
    }

    return (
        <>
            <RoundButton onClick={handleClick}>
                <Person />
            </RoundButton>
            <Popper
                open={open}
                anchorEl={anchorEl}
                role={undefined}
                placement={placement}
                transition
                onClick={handleClose}
                sx={{ zIndex: zIndex.popper }}
            >
                {({ TransitionProps }) => (
                    <Grow
                        {...TransitionProps}
                        style={{
                            transformOrigin: 'right top',
                        }}
                    >
                        <Paper sx={{ minWidth: 176 }}>
                            <ClickAwayListener onClickAway={handleClose}>
                                <Box>
                                    <MenuList
                                        autoFocusItem={open}
                                        id="composition-menu"
                                        aria-labelledby="composition-button"
                                    >
                                        {isAuthenticated ? (
                                            <MenuItem onClick={handleLogout}>Log Out</MenuItem>
                                        ) : (
                                            <>
                                                <MenuItem onClick={handleLogin}>Log In</MenuItem>
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
