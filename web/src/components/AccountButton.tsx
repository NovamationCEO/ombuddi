import { Person } from '@mui/icons-material'
import { Popper, Grow, Paper, ClickAwayListener, MenuList, MenuItem } from '@mui/material'
import type { PopperPlacementType } from '@mui/material'
import { Box } from '@mui/system'
import { useAuth0 } from '@auth0/auth0-react'
import React from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { RoundButton } from '../trusted-components/RoundButton'
import { zIndex } from '../constants/zIndex'
import { useCurrentOmbuds } from '../tools/useCurrentOmbuds'

export function AccountButton({ placement = 'bottom-end' }: { placement?: PopperPlacementType }) {
    const [anchorEl, setAnchorEl] = React.useState<HTMLButtonElement | null>(null)
    const { isAuthenticated, loginWithRedirect, logout } = useAuth0()
    const location = useLocation()
    const currentOmbuds = useCurrentOmbuds(location.pathname !== '/accept-invite')
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
                                        {isAuthenticated ? <>
                                            <MenuItem onClick={() => navigate('/welcome')}>Welcome</MenuItem>
                                            <MenuItem onClick={() => navigate('/')}>Home</MenuItem>
                                            <MenuItem onClick={() => navigate('/cases')}>Cases</MenuItem>
                                            <MenuItem onClick={() => navigate('/report')}>Reports</MenuItem>
                                            <MenuItem onClick={() => navigate('/profile')}>Profile</MenuItem>
                                            <MenuItem onClick={() => navigate('/add_person')}>Add Person</MenuItem>
                                            {currentOmbuds.data?.isAdmin && (
                                                <MenuItem onClick={() => navigate('/admin/users')}>Manage Users</MenuItem>
                                            )}
                                            {currentOmbuds.data?.isSystemAdmin && (
                                                <MenuItem onClick={() => navigate('/system/orgs')}>System Admin</MenuItem>
                                            )}
                                            <MenuItem onClick={() => logout({ logoutParams: { returnTo: window.location.origin } })}>Log Out</MenuItem>
                                        </> : <>
                                            <MenuItem onClick={() => loginWithRedirect()}>Log In</MenuItem>
                                        </>}
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
