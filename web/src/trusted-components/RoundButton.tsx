import { Box, IconButton, Tooltip } from '@mui/material'
import { useStyles } from '../tools/useStyles'
import React from 'react'

export function RoundButton(props: {
    onClick?: (evt: React.MouseEvent<HTMLButtonElement>) => void
    children: React.ReactNode
    size?: number
    disabled?: boolean
    tooltipText?: string | React.ReactNode
    bgcolor?: string
}) {
    const { onClick = () => null, children, size = 41, disabled = false, bgcolor = 'transparent' } = props
    const style = useStyles()
    return (
        <Tooltip title={props.tooltipText ? props.tooltipText : ''}>
            <Box
                {...style.roundButton}
                sx={{
                    width: size + 'px',
                    height: size + 'px',
                    bgcolor: bgcolor
                }}>
                <IconButton
                    onClick={onClick}
                    disabled={disabled}
                >
                    {children}
                </IconButton>
            </Box>
        </Tooltip>
    );
}
