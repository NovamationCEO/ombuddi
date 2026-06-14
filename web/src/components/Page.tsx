import { useStyles } from '../tools/useStyles'
import { Header } from './Header'
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
import { headerHeight } from '../constants/uiSizes'
import React from 'react'
import { useSessionSalt } from '../libraries/useSessionSalt'
import { useKeycloak } from '@react-keycloak/web'

export function Page(props: { element: ReactNode }) {
    const style = useStyles()
    const { sessionSalt, setSessionSalt } = useSessionSalt()
    const [draft, setDraft] = React.useState('')
    const { initialized } = useKeycloak()

    if (!initialized) {
        return (
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh' }}>
                <CircularProgress />
            </Box>
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
                <Box
                    sx={{
                        flex: 1,
                        display: 'flex',
                        flexDirection: 'column'
                    }}>
                    <Box
                        {...style.mainContainer}
                        sx={{
                            flex: 1,
                            marginTop: `${headerHeight + 20}px`,
                            overflow: 'auto'
                        }}>
                        {props.element}
                    </Box>
                </Box>
            </Box>

            <Dialog open={promptOpen} onClose={skip}>
                <DialogTitle>Session Salt Phrase</DialogTitle>
                <DialogContent>
                    <DialogContentText sx={{ mb: 2 }}>
                        Enter your salt phrase for this session. It will pre-fill the salt field
                        when adding visitors and will be used to encrypt and decrypt entry notes.
                        Leave blank to use no additional salt.
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
                    <Button variant="contained" onClick={confirm}>
                        Set Salt
                    </Button>
                </DialogActions>
            </Dialog>
        </Box>
    )
}
