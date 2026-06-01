import { Box, Stack } from '@mui/system'
import {
    Accordion,
    AccordionDetails,
    AccordionSummary,
    Button,
    Dialog,
    DialogActions,
    DialogContent,
    DialogContentText,
    DialogTitle,
    TextField,
} from '@mui/material'
import React from 'react'
import { Add, Edit, ArrowUpward, ArrowDownward } from '@mui/icons-material'
import { creator } from '../../tools/db_tools/creator'
import { updater } from '../../tools/db_tools/updater'
import { useGetter } from '../../tools/db_tools/useGetter'
import { RoundButton } from '../../trusted-components/RoundButton'
import { CodeCategoryType, CodeType } from '../../types/majorTypes'
import { RoundedContainer } from '../RoundedContainer'
import { useOrganization } from '../../tools/useOrganization'

export function CodeSummary() {
    const organization = useOrganization()
    const codeCategoryRes = useGetter<CodeCategoryType[]>(['get_code_categories_by_organization_id', organization.id])
    const [codeCategories, setCodeCategories] = React.useState<{ id: string; name: string; index: number }[]>([])
    const [editCodeCategoryId, setEditCodeCategoryId] = React.useState<string | undefined>(undefined)
    const [dialogText, setDialogText] = React.useState<string>('')
    const [confirmDelete, setConfirmDelete] = React.useState(false)
    const codesRes = useGetter<CodeType[]>(['get_codes_by_organization_id', organization.id])
    const [editCodeId, setEditCodeId] = React.useState<string | undefined>(undefined)
    const [editCodeCode, setEditCodeCode] = React.useState<string>('')
    const [editCodeDescription, setEditCodeDescription] = React.useState<string>('')
    const [showConfirmCodeDelete, setShowConfirmCodeDelete] = React.useState(false)

    React.useEffect(() => {
        if (!codeCategoryRes.data) return
        setCodeCategories(codeCategoryRes.data)
    }, [codeCategoryRes.data])

    React.useEffect(() => {
        if (!editCodeCategoryId) {
            setDialogText('')
            return
        }
        setDialogText(codeCategories.find((cc) => cc.id === editCodeCategoryId)?.name ?? '')
    }, [editCodeCategoryId])

    React.useEffect(() => {
        if (!editCodeId) {
            setEditCodeCode('')
            setEditCodeDescription('')
            return
        }
        const code = codesRes.data?.find((code) => code.id === editCodeId)
        if (!code) return
        setEditCodeCode(code.code ?? '')
        setEditCodeDescription(code.description ?? '')
    }, [editCodeId])

    async function updateCodeCategory() {
        if (!editCodeCategoryId) return
        const payload = { ...codeCategories.find((cc) => cc.id === editCodeCategoryId), name: dialogText }
        await updater<CodeCategoryType>('update_code_category', payload)
        codeCategoryRes.refetch()
        setEditCodeCategoryId(undefined)
    }

    async function deleteCodeCategory() {
        if (!editCodeCategoryId) return
        const payload = { ...codeCategories.find((cc) => cc.id === editCodeCategoryId), softDelete: true }
        await updater<CodeCategoryType>('update_code_category', payload)
        codeCategoryRes.refetch()
        setEditCodeCategoryId(undefined)
    }

    async function moveIndex(index: number, direction: number) {
        const current = codeCategories[Number(index)]
        const displaced = codeCategories[Number(index) + direction]
        if (!displaced) return

        await updater<CodeCategoryType>('update_code_category', {
            ...current,
            index: Number(index) + direction,
        })
        await updater<CodeCategoryType>('update_code_category', {
            ...displaced,
            index: Number(index),
        })
        codeCategoryRes.refetch()
    }

    async function newCodeCategory() {
        await creator<CodeCategoryType>('add_code_category', {
            organizationId: organization.id,
            name: 'New Category',
            softDelete: false,
            index: codeCategories.length,
        })
        codeCategoryRes.refetch()
    }

    async function addCode(categoryId: string) {
        if (!categoryId) return

        await creator<CodeType>('add_code', {
            organizationId: organization.id,
            categoryId: categoryId,
            softDelete: false,
            code: 'New Code',
            description: 'New Code Description',
        })
        codesRes.refetch()
    }

    async function updateCode() {
        if (!editCodeId) return
        const payload = {
            ...codesRes.data?.find((code) => code.id === editCodeId),
            code: editCodeCode,
            description: editCodeDescription,
        }
        await updater<CodeType>('update_code', payload)
        codesRes.refetch()
        setEditCodeId(undefined)
    }

    async function deleteCode() {
        if (!editCodeId) return
        const payload = {
            ...codesRes.data?.find((code) => code.id === editCodeId),
            softDelete: true,
        }
        await updater<CodeType>('update_code', payload)
        codesRes.refetch()
        setEditCodeId(undefined)
    }

    return (
        <Box>
            <Dialog
                open={!!editCodeId}
                onClose={() => setEditCodeId(undefined)}
            >
                <DialogTitle>Edit Code</DialogTitle>
                <DialogContent>
                    <Stack spacing={2}>
                        <Box></Box>
                        <TextField
                            value={editCodeCode}
                            onChange={(e) => setEditCodeCode(e.target.value)}
                            fullWidth
                            label={'Code'}
                        />
                        <TextField
                            value={editCodeDescription}
                            onChange={(e) => setEditCodeDescription(e.target.value)}
                            fullWidth
                            label={'Description'}
                        />
                    </Stack>
                </DialogContent>
                <DialogActions>
                    <Button
                        variant={'outlined'}
                        color={'error'}
                        onClick={deleteCode}
                    >
                        Delete Code
                    </Button>
                    <Button
                        variant={'outlined'}
                        onClick={() => setEditCodeId(undefined)}
                    >
                        Cancel
                    </Button>
                    <Button
                        variant={'contained'}
                        onClick={updateCode}
                    >
                        Save
                    </Button>
                </DialogActions>
            </Dialog>
            <Dialog
                open={confirmDelete}
                onClose={() => setConfirmDelete(false)}
            >
                <DialogTitle>Delete Code Category</DialogTitle>
                <DialogContent>
                    <DialogContentText>
                        Do you want to delete the code category '
                        {codeCategories.find((cc) => cc.id === editCodeCategoryId)?.name}'? All codes in this category
                        will be deleted as well. This will not affect existing records, but will new records will not be
                        able to select these codes.
                    </DialogContentText>
                </DialogContent>
                <DialogActions>
                    <Button
                        onClick={() => {
                            setConfirmDelete(false)
                            setEditCodeCategoryId(undefined)
                        }}
                    >
                        Keep Category
                    </Button>
                    <Button
                        color={'error'}
                        onClick={deleteCodeCategory}
                    >
                        Delete Category
                    </Button>
                </DialogActions>
            </Dialog>
            <Dialog
                open={showConfirmCodeDelete}
                onClose={() => setShowConfirmCodeDelete(false)}
            >
                <DialogTitle>Delete Code</DialogTitle>
                <DialogContent>
                    <DialogContentText>
                        Do you want to delete the code '{codesRes.data?.find((code) => code.id === editCodeId)?.code}'?
                        This will not affect existing records, but will new records will not be able to select this
                        code.
                    </DialogContentText>
                </DialogContent>
                <DialogActions>
                    <Button
                        onClick={() => {
                            setShowConfirmCodeDelete(false)
                            setEditCodeId(undefined)
                        }}
                    >
                        Keep Code
                    </Button>
                    <Button
                        color={'error'}
                        onClick={deleteCode}
                    >
                        Delete Code
                    </Button>
                </DialogActions>
            </Dialog>
            <Dialog
                open={!!editCodeCategoryId}
                onClose={() => setEditCodeCategoryId(undefined)}
            >
                <DialogTitle>Edit Code Category Name</DialogTitle>
                <DialogContent>
                    <TextField
                        value={dialogText}
                        onChange={(e) => setDialogText(e.target.value)}
                        fullWidth
                    />
                </DialogContent>
                <DialogActions>
                    <Button
                        variant={'outlined'}
                        onClick={() => setConfirmDelete(true)}
                        color={'error'}
                    >
                        Delete Category
                    </Button>
                    <Box sx={{
                        flex: 1
                    }} />
                    <Button
                        variant={'outlined'}
                        onClick={() => setEditCodeCategoryId(undefined)}
                    >
                        Cancel
                    </Button>
                    <Button
                        variant={'contained'}
                        onClick={updateCodeCategory}
                    >
                        Save
                    </Button>
                </DialogActions>
            </Dialog>
            <Stack spacing={2}>
                <RoundedContainer title={'Codes'}>
                    <Stack spacing={2}>
                        <Box sx={{
                            display: 'flex'
                        }}>
                            <Box
                                sx={{
                                    flex: 1,
                                    fontWeight: 'bold'
                                }}>
                                Categories
                            </Box>
                            <Box>
                                <RoundButton
                                    size={30}
                                    onClick={newCodeCategory}
                                >
                                    <Add />
                                </RoundButton>
                            </Box>
                        </Box>
                        <Box>
                            {codeCategories
                                .sort((a, b) => a.index - b.index)
                                .map((cc) => (
                                    <Accordion key={cc.id}>
                                        <AccordionSummary>
                                            <Box
                                                sx={{
                                                    display: 'flex',
                                                    fontWeight: 'bold',
                                                    flex: 1,
                                                    alignItems: 'center'
                                                }}>
                                                <Box sx={{
                                                    flex: 1
                                                }}>{cc.name}</Box>
                                                <RoundButton
                                                    size={40}
                                                    onClick={(e) => {
                                                        e.stopPropagation()
                                                        e.preventDefault()
                                                        setEditCodeCategoryId(cc.id)
                                                    }}
                                                >
                                                    <Edit />
                                                </RoundButton>
                                                <Box
                                                    sx={{
                                                        marginLeft: 1,
                                                        marginRight: 1
                                                    }}>
                                                    <RoundButton
                                                        size={40}
                                                        onClick={(e) => {
                                                            e.stopPropagation()
                                                            e.preventDefault()
                                                            moveIndex(cc.index, -1)
                                                        }}
                                                    >
                                                        <ArrowUpward />
                                                    </RoundButton>
                                                </Box>
                                                <RoundButton
                                                    size={40}
                                                    onClick={(e) => {
                                                        e.stopPropagation()
                                                        e.preventDefault()
                                                        moveIndex(cc.index, 1)
                                                    }}
                                                >
                                                    <ArrowDownward />
                                                </RoundButton>
                                            </Box>
                                        </AccordionSummary>
                                        <AccordionDetails>
                                            <Box>
                                                {codesRes.data
                                                    ?.filter((code) => code.categoryId === cc.id)
                                                    ?.map((code) => (
                                                        <Box
                                                            key={code.id}
                                                            sx={{
                                                                display: 'flex',
                                                                alignItems: 'center',
                                                                margin: 1
                                                            }}>
                                                            <RoundButton
                                                                size={30}
                                                                onClick={() => setEditCodeId(code.id)}
                                                            >
                                                                <Edit fontSize="small" />
                                                            </RoundButton>
                                                            <Box sx={{
                                                                width: 10
                                                            }} />
                                                            <b>{code.code}</b>
                                                            {code.code.length > 0 &&
                                                                code.description.length > 0 &&
                                                                ': '}
                                                            {code.description}
                                                        </Box>
                                                    ))}
                                                <Box
                                                    sx={{
                                                        display: 'flex',
                                                        justifyContent: 'flex-end',
                                                        flex: 1
                                                    }}>
                                                    <RoundButton
                                                        size={40}
                                                        onClick={(e) => {
                                                            e.stopPropagation()
                                                            e.preventDefault()
                                                            addCode(cc.id)
                                                        }}
                                                    >
                                                        <Add />
                                                    </RoundButton>
                                                </Box>
                                            </Box>
                                        </AccordionDetails>
                                    </Accordion>
                                ))}
                        </Box>
                    </Stack>
                </RoundedContainer>
            </Stack>
        </Box>
    );
}
