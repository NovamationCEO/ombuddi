import Grid2 from '@mui/material/Grid'
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
import { CodeSource, useCodeSource } from '../tools/useCodeSource'

export const OrgCodeSetter = React.memo(function CodeSetter(props: {
    activeCodes: string[]
    setActiveCodes: (codes: string[]) => void
    showCodeSetter: boolean
    setShowCodeSetter: (b: boolean) => void
    source: CodeSource
}) {
    const { activeCodes, setActiveCodes, showCodeSetter, setShowCodeSetter, source } = props
    const [openIndex, setOpenIndex] = React.useState<number>(0)
    const [localCodes, setLocalCodes] = React.useState<string[]>([])

    const { title, codes, codeCategories } = useCodeSource(source)

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
                sx={{
                    color: isMatch ? 'forestgreen' : 'black',
                    userSelect: 'none',
                }}
            >
                {codeId + ': ' + codeLabel}
            </Box>
        ),
        [],
    )

    return (
        <Dialog open={showCodeSetter}>
            <DialogTitle>{title}</DialogTitle>
            <DialogContent>
                <Grid2 container>
                    {[...codeCategories]
                        .sort((a, b) => a.index - b.index)
                        .map((category, index) => {
                            const isExpanded = openIndex === index

                            return (
                                <Accordion
                                    key={category.id}
                                    expanded={isExpanded}
                                    onChange={(_, expanded) => setOpenIndex(expanded ? index : null)}
                                    disableGutters
                                >
                                    <AccordionSummary>
                                        <Box sx={{ fontWeight: 'bold' }}>{category.name}</Box>
                                    </AccordionSummary>
                                    <AccordionDetails>
                                        <Grid2
                                            container
                                            spacing={2}
                                        >
                                            {codes
                                                .filter((code) => code.categoryId === category.id)
                                                .map((code) => {
                                                    const isMatch = localCodes.includes(code.id)
                                                    return (
                                                        <Grid2
                                                            key={code.id}
                                                            size={12}
                                                        >
                                                            <Box onClick={(e) => e.stopPropagation()}>
                                                                <MySwitch
                                                                    value={isMatch}
                                                                    setValue={(b) => handleToggle(code.id, b)}
                                                                    label={getLabel(
                                                                        code.code,
                                                                        code.description,
                                                                        isMatch,
                                                                    )}
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
            </DialogContent>
            <DialogActions>
                <Button onClick={cancel}>Cancel</Button>
                <Button
                    variant={'contained'}
                    onClick={save}
                >
                    Save
                </Button>
            </DialogActions>
        </Dialog>
    )
})
