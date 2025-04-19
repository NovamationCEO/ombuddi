import Grid2 from '@mui/material/Unstable_Grid2'
import { Box } from '@mui/system'
import { MySwitch } from './MySwitch'
import {
    Accordion,
    AccordionDetails,
    AccordionSummary,
    Button,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
} from '@mui/material'
import React from 'react'
import { ioaCategories, ioaCodes } from '../constants/ioaConstants'

export const CodeSetter = React.memo(function CodeSetter(props: {
    activeCodes: string[]
    setActiveCodes: (codes: string[]) => void
    showCodeSetter: boolean
    setShowCodeSetter: (b: boolean) => void
}) {
    const { activeCodes, setActiveCodes, showCodeSetter, setShowCodeSetter } = props
    const [openIndex, setOpenIndex] = React.useState<number>(0)
    const [localCodes, setLocalCodes] = React.useState<string[]>([])

    React.useEffect(() => {
        setLocalCodes(activeCodes)
    }, [activeCodes, showCodeSetter])

    function handleToggle(codeId: string, newVal: boolean) {
        setLocalCodes((prev) => (newVal ? [...prev, codeId] : prev.filter((c) => c !== codeId)))
    }

    function save() {
        setActiveCodes(localCodes)
        setShowCodeSetter(false)
    }

    function cancel() {
        setShowCodeSetter(false)
    }

    const getLabel = React.useCallback(
        (codeId: string, codeLabel: string, isMatch: boolean) => (
            <Box
                color={isMatch ? 'forestgreen' : 'black'}
                sx={{ userSelect: 'none' }}
            >
                {codeId + ': ' + codeLabel}
            </Box>
        ),
        [],
    )

    return (
        <Grid2 container>
            {categories.map((category, index) => {
                const isExpanded = openIndex === index

                return (
                    <Accordion
                        key={category}
                        expanded={isExpanded}
                        onChange={(_, expanded) => setOpenIndex(expanded ? index : null)}
                        disableGutters
                    >
                        <AccordionSummary>
                            <Box fontWeight="bold">{category}</Box>
                        </AccordionSummary>
                        <AccordionDetails>
                            <Grid2
                                container
                                spacing={2}
                            >
                                {codes
                                    .filter((code) => code[0][0] === (index + 1).toString())
                                    .map(([codeId, codeLabel]) => {
                                        const isMatch = activeCodes.includes(codeId)
                                        return (
                                            <Grid2
                                                xs={12}
                                                sm={6}
                                                lg={4}
                                                xl={3}
                                                key={codeId}
                                            >
                                                <Box onClick={(e) => e.stopPropagation()}>
                                                    <MySwitch
                                                        value={isMatch}
                                                        setValue={(b) => handleToggle(codeId, b)}
                                                        label={getLabel(codeId, codeLabel, isMatch)}
                                                    />
                                                </Box>
                                            </Grid2>
                                        )
                                    })}
                            </Grid2>
                        </AccordionDetails>
                    </Accordion>
                )
            })}
        </Grid2>
    )
})
