import { Accordion, AccordionDetails, AccordionSummary, Box, Button, ButtonGroup, Stack } from '@mui/material'
import React from 'react'
import { AddNewCase } from './AddNewCase'

export function SelectCase() {
    const [caseId, setCaseId] = React.useState('')
    const [tab, setTab] = React.useState(0)

    const caseButtonTitles = ['Create New Workheap', 'Load Existing Workheap', 'Log Without Workheap']

    function CaseButton(props: { title: string; index: number }) {
        return (
            <Button
                variant={tab === props.index ? 'contained' : 'outlined'}
                onClick={() => setTab(props.index)}
            >
                {props.title}
            </Button>
        )
    }

    return (
        <Box>
            <Stack spacing={2}>
                <Accordion expanded={true}>
                    <AccordionSummary
                        sx={{
                            display: 'flex',
                        }}
                    >
                        <Box
                            display={'flex'}
                            flex={1}
                            justifyContent={'center'}
                        >
                            <ButtonGroup
                                variant="outlined"
                                sx={{
                                    overflow: 'hidden',
                                    '& > button:first-of-type': {
                                        borderTopLeftRadius: 16,
                                        borderBottomLeftRadius: 16,
                                    },
                                    '& > button:last-of-type': {
                                        borderTopRightRadius: 16,
                                        borderBottomRightRadius: 16,
                                    },
                                    '& .MuiButton-outlined': {
                                        bgcolor: 'white',
                                        '&:hover': {
                                            bgcolor: 'grey.100',
                                        },
                                    },
                                }}
                            >
                                {caseButtonTitles.map((title, n) => (
                                    <CaseButton
                                        key={title}
                                        title={title}
                                        index={n}
                                    />
                                ))}
                            </ButtonGroup>
                        </Box>
                    </AccordionSummary>
                    <AccordionDetails>
                        {tab === 0 && <AddNewCase />}
                        {tab === 1 && <Box>Load</Box>}
                        {tab === 2 && <Box>Skip</Box>}
                    </AccordionDetails>
                </Accordion>
            </Stack>
        </Box>
    )
}
