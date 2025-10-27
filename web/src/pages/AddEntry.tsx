import { Box, Step, StepLabel, Stepper } from '@mui/material'
import { SelectCase } from '../components/AddEntry/SelectCase'
import { LoadAllCases } from '../components/LoadAllCases/SelectCase'

export function AddEntry() {
    const steps = ['Identify Case', 'Visitor Information', 'Save Entry']

    return (
        <Box>
            {/* <Box sx={{ width: '100%' }}>
                <Stepper
                    activeStep={1}
                    alternativeLabel
                >
                    {steps.map((label) => (
                        <Step key={label}>
                            <StepLabel>{label}</StepLabel>
                        </Step>
                    ))}
                </Stepper>
            </Box> */}
            <LoadAllCases />
        </Box>
    )
}
