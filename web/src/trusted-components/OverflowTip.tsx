import { Tooltip } from '@mui/material'
import { Box } from '@mui/system'
import React from 'react'

export function OverflowTip(props: { children: React.ReactNode }) {
    const { children } = props
    const [overflowed, setOverflowed] = React.useState(true)
    const boxRef = React.useRef<HTMLDivElement | null>(null)

    React.useEffect(() => {
        if (!boxRef.current) return
        setOverflowed(boxRef.current.scrollWidth > boxRef.current.clientWidth)
    }, [boxRef.current?.clientWidth])

    return (
        <Tooltip
            title={children}
            disableHoverListener={!overflowed}
        >
            <Box
                ref={boxRef}
                style={{
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                }}
            >
                {children}
            </Box>
        </Tooltip>
    )
}
