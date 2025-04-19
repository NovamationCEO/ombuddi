import { Box, Button, Paper, Step, StepContent, StepLabel, Stepper, Typography } from '@mui/material'
import React from 'react'
import { SelectCase } from '../components/AddEntry/SelectCase'

export function AddEntry() {
    const steps = [
        {
            label: 'Select Workheap',
            description: `You can select an existing workheap, create a new one, or skip it altogether.`,
        },
        {
            label: 'Add Details',
            description: 'An ad group contains one or more ads which target a shared set of keywords.',
        },
    ]

    const [activeStep, setActiveStep] = React.useState(0)

    const handleNext = () => {
        setActiveStep((prevActiveStep) => prevActiveStep + 1)
    }

    const handleBack = () => {
        setActiveStep((prevActiveStep) => prevActiveStep - 1)
    }

    const handleReset = () => {
        setActiveStep(0)
    }

    return (
        <Box>
            <Box display={'flex'}>
                <Box flex={1}>
                    <Stepper activeStep={activeStep}>
                        {steps.map((step, index) => (
                            <Step key={step.label}>
                                <StepLabel
                                    optional={
                                        index === steps.length - 1 ? (
                                            <Typography variant="caption">Last step</Typography>
                                        ) : null
                                    }
                                >
                                    {step.label}
                                </StepLabel>
                                <StepContent>
                                    <Typography>{step.description}</Typography>
                                    <Box sx={{ mb: 2 }}>
                                        <Button
                                            variant="contained"
                                            onClick={handleNext}
                                            sx={{ mt: 1, mr: 1 }}
                                        >
                                            {index === steps.length - 1 ? 'Finish' : 'Continue'}
                                        </Button>
                                        <Button
                                            disabled={index === 0}
                                            onClick={handleBack}
                                            sx={{ mt: 1, mr: 1 }}
                                        >
                                            Back
                                        </Button>
                                    </Box>
                                </StepContent>
                            </Step>
                        ))}
                    </Stepper>
                    {activeStep === steps.length && (
                        <Paper
                            square
                            elevation={0}
                            sx={{ p: 3 }}
                        >
                            <Typography>All steps completed - you&apos;re finished</Typography>
                            <Button
                                onClick={handleReset}
                                sx={{ mt: 1, mr: 1 }}
                            >
                                Reset
                            </Button>
                        </Paper>
                    )}
                </Box>
            </Box>
            <Box>{activeStep === 0 && <SelectCase />}</Box>
        </Box>
    )
}
