import { useStyles } from '../tools/useStyles'
import type { ReactNode } from 'react'

import {
    Box,
    Button,
    CircularProgress,
    Dialog,
    DialogActions,
    DialogContent,
    DialogContentText,
    DialogTitle,
    TextField,
} from '@mui/material'
import React from 'react'
import { useSessionSalt } from '../libraries/useSessionSalt'
import { useAuth0 } from '@auth0/auth0-react'
import { Navigate } from 'react-router-dom'
import { AppRail } from './AppRail'
import { institutionalPalette as palette } from '../theme/institutionalPalette'

export function Page(props: { element: ReactNode; fullBleed?: boolean }) {
    const style = useStyles()
    const { sessionSalt, setSessionSalt } = useSessionSalt()
    const [draft, setDraft] = React.useState('')
    const { isLoading, isAuthenticated } = useAuth0()

    if (isLoading) {
        return (
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh' }}>
                <CircularProgress />
            </Box>
        )
    }

    if (!isAuthenticated) {
        return (
            <Navigate
                to="/welcome"
                replace
            />
        )
    }

    // sessionSalt === null means the user hasn't been prompted yet this session.
    const promptOpen = sessionSalt === null

    function confirm() {
        setSessionSalt(draft.trim())
    }

    function skip() {
        setSessionSalt('')
    }

    return (
        <Box
            sx={{
                width: '100vw',
                height: '100vh',
                position: 'relative',
                display: 'flex',
                flexDirection: { xs: 'column', md: 'row' },
                color: style.contrast,
                bgcolor: palette.backgroundDeep,
            }}
        >
            <AppRail />
            <Box
                sx={{
                    flex: 1,
                    minWidth: 0,
                    minHeight: 0,
                    position: 'relative',
                    display: 'flex',
                    order: { xs: 1, md: 0 },
                }}
            >
                <Box
                    sx={{
                        flex: 1,
                        display: 'flex',
                        flexDirection: 'column',
                        minWidth: 0,
                    }}
                >
                    <Box
                        {...(!props.fullBleed ? style.mainContainer : {})}
                        sx={{
                            flex: 1,
                            minWidth: 0,
                            boxSizing: 'border-box',
                            overflow: 'auto',
                        }}
                    >
                        {props.element}
                    </Box>
                </Box>
            </Box>

            <Dialog
                open={promptOpen}
                onClose={skip}
            >
                <DialogTitle>Session Salt Phrase</DialogTitle>
                <DialogContent>
                    <DialogContentText sx={{ mb: 2 }}>
                        Enter your salt phrase for this session. It will pre-fill the salt field when adding visitors
                        and will be used to encrypt and decrypt entry notes. Leave blank to use no additional salt.
                    </DialogContentText>
                    <TextField
                        autoFocus
                        fullWidth
                        label="Salt Phrase"
                        value={draft}
                        onChange={(e) => setDraft(e.target.value)}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter') confirm()
                        }}
                    />
                </DialogContent>
                <DialogActions>
                    <Button onClick={skip}>Skip (no salt)</Button>
                    <Button
                        variant="contained"
                        onClick={confirm}
                    >
                        Set Salt
                    </Button>
                </DialogActions>
            </Dialog>
        </Box>
    )
}
