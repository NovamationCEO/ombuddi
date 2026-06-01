import { TextField } from '@mui/material'
import React from 'react'

export function NumberField(props: {
    value: string
    setValue: (s: string) => void
    label?: string
    min?: number
    max?: number
    disabled?: boolean
    step?: number
    helperText?: string
    multiple?: number
}) {
    const { value, setValue, label, min, max, disabled, step, helperText, multiple } = props

    const [forceText, setForceText] = React.useState(value === '0' || value === '0-')

    function changeTo(n: string) {
        const textValues = ['0-', '-', '', '0.', '-.']
        const keepText = textValues.includes(n)
        setForceText(keepText)

        if (n.length > 1 && n[0] === '0' && n[1] !== '.') {
            setValue(n.slice(1))
            return
        }

        if (n.length === 0 || (!keepText && isNaN(Number(n)))) {
            setValue('0')
            return
        }
        if (n[0] === '0' && n[1] !== '.') {
            setValue(n.slice(1))
            return
        }
        setValue(n)
    }
    function constrainTo(n: string) {
        const incomingValue = n
        const maxValue = isNaN(Number(max)) ? incomingValue : Math.min(Number(n), max)
        const minValue = isNaN(Number(min)) ? maxValue : Math.max(Number(maxValue), min)

        const multipleValue = isNaN(Number(multiple))
            ? minValue
            : Math.floor(Number(minValue) / (multiple || 1)) * multiple
        changeTo(multipleValue.toString())
    }

    return (
        <TextField
            label={label}
            value={value}
            onChange={(e) => changeTo(e.target.value)}
            onBlur={(e) => constrainTo(e.target.value)}
            type={forceText ? 'text' : 'number'}
            fullWidth
            disabled={disabled}
            helperText={
                helperText || (multiple && multiple > 1) ? 'Rounded down to nearest multiple of ' + multiple : undefined
            }
            slotProps={{
                htmlInput: { step: step ? step : 1, max: max, min: min }
            }}
        />
    );
}
