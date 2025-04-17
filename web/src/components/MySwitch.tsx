import { FormControlLabel, Switch, FormGroup } from '@mui/material'
import { FormControlLabel, Switch } from '@mui/material'

export function MySwitch(props: {
    value: boolean
    setValue: (b: boolean) => void
    disabled?: boolean
    label: string | JSX.Element
}) {
    const { value, setValue, disabled = false, label } = props

    return (
        <FormGroup>
            <FormControlLabel
                control={
                    <Switch
                        checked={value}
                        onChange={() => setValue(!value)}
                        disabled={disabled}
                    />
                }
                label={label}
            />
        </FormGroup>
    )
}
