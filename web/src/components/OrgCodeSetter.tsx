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
import { useGetter } from '../tools/db_tools/useGetter'
import { CodeCategoryType, CodeType, OrganizationType } from '../types/majorTypes'

export const OrgCodeSetter = React.memo(function CodeSetter(props: {
    activeCodes: string[]
    setActiveCodes: (codes: string[]) => void
    showCodeSetter: boolean
    setShowCodeSetter: (b: boolean) => void
    organizationId: string
}) {
    const { activeCodes, setActiveCodes, showCodeSetter, setShowCodeSetter, organizationId } = props
    const [openIndex, setOpenIndex] = React.useState<number>(0)
    const [localCodes, setLocalCodes] = React.useState<string[]>([])

    const orgRes = useGetter<OrganizationType>(['get_organization_by_id', organizationId])
    const codesRes = useGetter<CodeType[]>(['get_codes_by_organization_id', organizationId])
    const categoriesRes = useGetter<CodeCategoryType[]>(['get_code_categories_by_organization_id', organizationId])

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
        <Dialog open={showCodeSetter}>
            <DialogTitle>{orgRes.data?.name} Codes</DialogTitle>
            <DialogContent>
                <Grid2 container>
                    {categoriesRes.data
                        ?.sort((a, b) => a.index - b.index)
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
                                        <Box fontWeight="bold">{category.name}</Box>
                                    </AccordionSummary>
                                    <AccordionDetails>
                                        <Grid2
                                            container
                                            spacing={2}
                                        >
                                            {(codesRes.data || [])
                                                .filter((code) => code.categoryId === category.id)
                                                .map((code) => {
                                                    const isMatch = localCodes.includes(code.id)
                                                    return (
                                                        <Grid2
                                                            xs={12}
                                                            key={code.id}
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
