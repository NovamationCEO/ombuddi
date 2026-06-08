import { Box, useTheme } from '@mui/material'
import { RoundedContainer } from './RoundedContainer'
import { CodeCategoryType, CodeType } from '../types/majorTypes'
import React from 'react'
import { OrgCodeSetter } from './OrgCodeSetter'
import { CodeSource, useCodeSource } from '../tools/useCodeSource'

export function CodeSetterBox(props: {
    activeCodeIds: string[]
    setActiveCodeIds: (codes: string[]) => void
    source: CodeSource
}) {
    const { activeCodeIds, setActiveCodeIds, source } = props
    const [showModal, setShowModal] = React.useState(false)
    const theme = useTheme()

    const { title, codes, codeCategories } = useCodeSource(source)

    const activeCodes = React.useMemo<CodeType[]>(() => {
        const res = codes.filter((code) => activeCodeIds.includes(code.id))
        res.sort((a, b) => {
            if (a.code[1] < b.code[1]) return -1
            if (a.code[1] > b.code[1]) return 1
            if (a.code[0] < b.code[0]) return -1
            if (a.code[0] > b.code[0]) return 1
            return 0
        })
        return res
    }, [codes, activeCodeIds])

    const activeCategories = React.useMemo<CodeCategoryType[]>(() => {
        if (!activeCodes.length) return []
        const activeCategoryIds = new Set(activeCodes.map((code) => code.categoryId))
        return codeCategories.filter((category) => activeCategoryIds.has(category.id))
    }, [activeCodes, codeCategories])

    return (
        <Box
            sx={{
                maxWidth: '1000px',
                flex: 1,
            }}
        >
            <OrgCodeSetter
                showCodeSetter={showModal}
                setShowCodeSetter={setShowModal}
                activeCodes={activeCodeIds}
                setActiveCodes={setActiveCodeIds}
                source={source}
            />
            <RoundedContainer title={title}>
                <Box
                    onClick={() => setShowModal(true)}
                    sx={{
                        border: '1px solid black',
                        padding: 2,
                    }}
                >
                    {activeCodes.length === 0 && <Box>None Selected. Click to Edit.</Box>}
                    {activeCategories.map((category) => (
                        <Box key={category.id}>
                            <Box
                                sx={{
                                    color: 'white',
                                    bgcolor: theme.palette.secondary.dark,
                                    padding: 0.5,
                                    marginTop: 1,
                                }}
                            >
                                {category.name}
                            </Box>
                            {activeCodes
                                .filter((code) => code.categoryId === category.id)
                                .map((code) => (
                                    <Box key={code.id}>
                                        <b>{code.code}</b>: {code.description}
                                    </Box>
                                ))}
                        </Box>
                    ))}
                </Box>
            </RoundedContainer>
        </Box>
    )
}
