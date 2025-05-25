import { Box, IconButton, Tooltip } from '@mui/material'
import { useStyles } from '../tools/useStyles'
import React from 'react'

export function RoundButton(props: {
    onClick?: (evt: React.MouseEvent<HTMLButtonElement>) => void
    children: JSX.Element
    size?: number
    disabled?: boolean
    tooltipText?: string | React.ReactNode
}) {
    const { onClick = () => null, children, size = 41, disabled = false } = props
    const style = useStyles()
    return (
        <Tooltip title={props.tooltipText ? props.tooltipText : ''}>
            <Box
                {...style.roundButton}
                width={size + 'px'}
                height={size + 'px'}
            >
                <IconButton
                    onClick={onClick}
                    disabled={disabled}
                >
                    {children}
                </IconButton>
            </Box>
        </Tooltip>
    )
}
