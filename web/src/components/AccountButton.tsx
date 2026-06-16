import { Person } from '@mui/icons-material'
import { Popper, Grow, Paper, ClickAwayListener, MenuList, MenuItem } from '@mui/material'
import { Box } from '@mui/system'
import { useAuth0 } from '@auth0/auth0-react'
import React from 'react'
import { useNavigate } from 'react-router-dom'
import { RoundButton } from '../trusted-components/RoundButton'
import { zIndex } from '../constants/zIndex'

export function AccountButton() {
    const [anchorEl, setAnchorEl] = React.useState<HTMLButtonElement | null>(null)
    const { isAuthenticated, loginWithRedirect, logout } = useAuth0()
    const navigate = useNavigate()

    const open = Boolean(anchorEl)

    const handleClick = (event: React.MouseEvent<HTMLButtonElement>) => {
        setAnchorEl(event.currentTarget)
    }

    const handleClose = () => {
        setAnchorEl(null)
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
                                <Box sx={{ zIndex: zIndex.popper }}>
                                    <MenuList
                                        autoFocusItem={open}
                                        id="composition-menu"
                                        aria-labelledby="composition-button"
                                    >
                                        <MenuItem onClick={() => navigate('/welcome')}>Welcome</MenuItem>
                                        <MenuItem onClick={() => navigate('/')}>Home</MenuItem>
                                        <MenuItem onClick={() => navigate('/cases')}>Cases</MenuItem>
                                        <MenuItem onClick={() => navigate('/report')}>Reports</MenuItem>
                                        <MenuItem onClick={() => navigate('/profile')}>Profile</MenuItem>
                                        <MenuItem onClick={() => navigate('/add_person')}>Add Person</MenuItem>
                                        {isAuthenticated
                                            ? <MenuItem onClick={() => logout({ logoutParams: { returnTo: window.location.origin } })}>Log Out</MenuItem>
                                            : <MenuItem onClick={() => loginWithRedirect()}>Log In</MenuItem>
                                        }
                                    </MenuList>
                                </Box>
                            </ClickAwayListener>
                        </Paper>
                    </Grow>
                )}
            </Popper>
        </>
    );
}
