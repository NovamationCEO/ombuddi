import { Box, useTheme } from '@mui/material'
import { RoundedContainer } from './RoundedContainer'
import { useGetter } from '../tools/db_tools/useGetter'
import { CodeCategoryType, CodeType, OrganizationType } from '../types/majorTypes'
import React from 'react'
import { OrgCodeSetter } from './OrgCodeSetter'

export function CodeSetterBox(props: {
    activeCodeIds: string[]
    setActiveCodeIds: (codes: string[]) => void
    organizationId: string
}) {
    const { activeCodeIds, setActiveCodeIds, organizationId } = props
    const [showModal, setShowModal] = React.useState(false)
    const theme = useTheme()

    const orgRes = useGetter<OrganizationType>(['get_organization_by_id', organizationId])

    const orgCodesRes = useGetter<CodeType[]>(['get_codes_by_organization_id', organizationId])
    const orgCodeCategoriesRes = useGetter<CodeCategoryType[]>([
        'get_code_categories_by_organization_id',
        organizationId,
    ])

    const activeCodes = React.useMemo<CodeType[]>(() => {
        if (!orgCodesRes.data) return []
        const res = orgCodesRes.data?.filter((code) => activeCodeIds.includes(code.id)) || []
        res.sort((a, b) => {
            if (a.code[1] < b.code[1]) return -1
            if (a.code[1] > b.code[1]) return 1
            if (a.code[0] < b.code[0]) return -1
            if (a.code[0] > b.code[0]) return 1
            return 0
        })
        return res
    }, [orgCodesRes.data, activeCodeIds])

    const activeCategories = React.useMemo<CodeCategoryType[]>(() => {
        if (!orgCodeCategoriesRes.data || !activeCodes || !activeCodes.length) return []
        const activeCategoryIds = [...new Set(activeCodes.map((code) => code.categoryId))]
        return orgCodeCategoriesRes.data?.filter((category) =>
            activeCategoryIds.includes(category.id),
        ) as CodeCategoryType[]
    }, [activeCodes, orgCodeCategoriesRes.data])

    return (
        <Box
            sx={{
                maxWidth: '1000px',
                flex: 1
            }}>
            <OrgCodeSetter
                showCodeSetter={showModal}
                setShowCodeSetter={setShowModal}
                activeCodes={activeCodeIds}
                setActiveCodes={setActiveCodeIds}
                organizationId={organizationId}
            />
            <RoundedContainer title={orgRes.data?.name + ' Codes'}>
                <Box
                    onClick={() => setShowModal(true)}
                    sx={{
                        border: '1px solid black',
                        padding: 2
                    }}>
                    {activeCodes?.length === 0 && <Box>None Selected. Click to Edit.</Box>}
                    {activeCategories.map((category) => (
                        <Box key={category.id}>
                            <Box
                                sx={{
                                    color: 'white',
                                    bgcolor: theme.palette.secondary.dark,
                                    padding: 0.5,
                                    marginTop: 1
                                }}>
                                {category.name}
                            </Box>
                            {activeCodes
                                .filter((code) => code.categoryId === category.id)
                                .map((code) => (
                                    <Box key={code.id}>
                                        <b>{orgCodesRes.data?.find((c) => c.id === code.id)?.code}</b>:{' '}
                                        {orgCodesRes.data?.find((c) => c.id === code.id)?.description}
                                    </Box>
                                ))}
                        </Box>
                    ))}
                </Box>
            </RoundedContainer>
        </Box>
    );
}
