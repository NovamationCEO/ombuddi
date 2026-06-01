import { FormControlLabel, Switch } from '@mui/material'
import React from 'react'

export const MySwitch = React.memo(function MySwitch(props: {
    value: boolean
    setValue: (b: boolean) => void
    disabled?: boolean
    label: React.ReactNode
}) {
    const { value, setValue, disabled = false, label } = props

    const handleChange = React.useCallback(() => {
        setValue(!value)
    }, [value, setValue])

    return (
        <FormControlLabel
            control={
                <Switch
                    checked={value}
                    onChange={handleChange}
                    disabled={disabled}
                />
            }
            label={label}
        />
    )
})
