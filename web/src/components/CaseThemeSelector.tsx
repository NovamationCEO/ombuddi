import { Autocomplete, TextField } from '@mui/material'
import { usePicklists } from '../tools/usePicklists'
import { normalizeCaseThemes } from '../tools/caseThemes'

export function CaseThemeSelector({
    value,
    onChange,
    disabled = false,
}: {
    value: string[]
    onChange: (themes: string[]) => void
    disabled?: boolean
}) {
    const suggestions = usePicklists('case_theme')
    const options = normalizeCaseThemes(suggestions.items.map((item) => item.name))
    return (
        <Autocomplete
            multiple
            freeSolo
            autoSelect
            filterSelectedOptions
            disabled={disabled}
            loading={suggestions.isLoading}
            options={options}
            value={value}
            isOptionEqualToValue={(option, selected) => option.toLowerCase() === selected.toLowerCase()}
            onChange={(_event, next) => onChange(normalizeCaseThemes(next, options))}
            renderInput={(params) => (
                <TextField
                    {...params}
                    label="Themes"
                    variant="standard"
                    helperText="Select or type a theme. New themes join your organization’s list when saved."
                />
            )}
            sx={{
                '& .MuiChip-label': { whiteSpace: 'normal', overflowWrap: 'anywhere' },
                '& .MuiChip-root': { height: 'auto', minHeight: 28, py: 0.25 },
            }}
        />
    )
}
