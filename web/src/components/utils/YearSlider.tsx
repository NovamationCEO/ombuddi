import Box from '@mui/material/Box'
import Slider from '@mui/material/Slider'

export function yearSlider(range: number[], onChange: (na: number[]) => void) {
    const handleChange = (_event: Event, newValue: number | number[]) => {
        onChange(newValue as number[])
    }

    return (
        <Box sx={{ margin: '10px' }}>
            <Slider
                getAriaLabel={() => 'Year Slider'}
                value={range}
                onChange={handleChange}
                valueLabelDisplay="on"
                min={2010}
                max={2020}
            />
        </Box>
    )
}
