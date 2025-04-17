import { Snackbar, Alert, AlertProps } from '@mui/material'
import React from 'react'

export type SnackType = {
    message: string
    severity?: AlertProps['severity']
}

export function Snack(props: { snack: SnackType }) {
    const [open, setOpen] = React.useState(false)

    React.useEffect(() => {
        if (props.snack.message.length) setOpen(true)
    }, [props.snack])

    function handleClose() {
        setOpen(false)
    }
    return (
        <>
            <Snackbar
                open={open}
                autoHideDuration={6000}
                onClose={handleClose}
            >
                <Alert
                    onClose={handleClose}
                    severity={props.snack.severity || 'info'}
                    variant="filled"
                    sx={{ width: '100%' }}
                >
                    {props.snack.message}
                </Alert>
            </Snackbar>
        </>
    )
}
