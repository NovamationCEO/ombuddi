import React from 'react'
import { Add, ArrowDownward, ArrowUpward, Delete, Edit } from '@mui/icons-material'
import {
    Box,
    Button,
    Dialog,
    DialogActions,
    DialogContent,
    DialogContentText,
    DialogTitle,
    IconButton,
    Stack,
    TextField,
} from '@mui/material'
import { RoundedContainer } from '../RoundedContainer'
import { useOrganization } from '../../tools/useOrganization'
import { PrimaryRoleType } from '../../types/majorTypes'
import { useGetter } from '../../tools/db_tools/useGetter'
import { creator } from '../../tools/db_tools/creator'
import { updater } from '../../tools/db_tools/updater'
import { useSnack } from '../../libraries/useSnack'

export function PrimaryRoles() {
    const organization = useOrganization()
    const [roleList, setRoleList] = React.useState<PrimaryRoleType[]>([])
    const [editingId, setEditingId] = React.useState<string | null>(null)
    const [editingName, setEditingName] = React.useState('')
    const [pendingDeleteId, setPendingDeleteId] = React.useState<string | null>(null)
    const primaryRolesRes = useGetter<PrimaryRoleType[]>(['get_primary_roles_by_organization_id', organization.id])
    const setSnack = useSnack((state) => state.setSnack)
    const editingRole = roleList.find((role) => role.id === editingId) ?? null
    const pendingDeleteRole = roleList.find((role) => role.id === pendingDeleteId) ?? null

    React.useEffect(() => {
        if (!primaryRolesRes.data) return
        setRoleList([...primaryRolesRes.data].sort((a, b) => a.index - b.index))
    }, [primaryRolesRes.data])

    function startEdit(role: PrimaryRoleType) {
        setEditingId(role.id)
        setEditingName(role.name)
    }

    async function commitEdit() {
        if (!editingRole) return
        const name = editingName.trim()
        if (!name) return
        if (roleList.some((role) => role.id !== editingRole.id && role.name.toLowerCase() === name.toLowerCase())) {
            setSnack({ message: `“${name}” is already a primary role.`, severity: 'warning' })
            return
        }

        try {
            await updater<PrimaryRoleType>('update_primary_role', { id: editingRole.id, name })
            await primaryRolesRes.refetch()
            setEditingId(null)
        } catch (error) {
            setSnack({
                message: error instanceof Error ? error.message : 'Failed to save primary role.',
                severity: 'error',
            })
        }
    }

    async function addNew() {
        if (!organization.id) return
        const nextIndex = roleList.reduce((highest, role) => Math.max(highest, role.index), -1) + 1
        try {
            await creator('add_primary_role', {
                organizationId: organization.id,
                name: 'New primary role',
                index: nextIndex,
                softDelete: false,
            })
            await primaryRolesRes.refetch()
        } catch (error) {
            setSnack({
                message: error instanceof Error ? error.message : 'Failed to add primary role.',
                severity: 'error',
            })
        }
    }

    async function softDelete(id: string) {
        try {
            await updater<PrimaryRoleType>('update_primary_role', { id, softDelete: true })
            await primaryRolesRes.refetch()
            setPendingDeleteId(null)
        } catch (error) {
            setSnack({
                message: error instanceof Error ? error.message : 'Failed to delete primary role.',
                severity: 'error',
            })
        }
    }

    async function move(role: PrimaryRoleType, direction: -1 | 1) {
        const currentIndex = roleList.findIndex((item) => item.id === role.id)
        const destinationIndex = currentIndex + direction
        if (destinationIndex < 0 || destinationIndex >= roleList.length) return
        const otherRole = roleList[destinationIndex]

        try {
            await Promise.all([
                updater<PrimaryRoleType>('update_primary_role', { id: role.id, index: otherRole.index }),
                updater<PrimaryRoleType>('update_primary_role', { id: otherRole.id, index: role.index }),
            ])
            await primaryRolesRes.refetch()
        } catch (error) {
            setSnack({
                message: error instanceof Error ? error.message : 'Failed to reorder primary roles.',
                severity: 'error',
            })
        }
    }

    return (
        <>
            <Dialog open={!!editingRole} onClose={() => setEditingId(null)}>
                <DialogTitle>Edit primary role</DialogTitle>
                <DialogContent>
                    <TextField
                        label="Name"
                        value={editingName}
                        onChange={(event) => setEditingName(event.target.value)}
                        onKeyDown={(event) => {
                            if (event.key === 'Enter') void commitEdit()
                        }}
                        autoFocus
                        fullWidth
                        sx={{ mt: 1 }}
                    />
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setEditingId(null)}>Cancel</Button>
                    <Button variant="contained" onClick={() => void commitEdit()} disabled={!editingName.trim()}>
                        Save
                    </Button>
                </DialogActions>
            </Dialog>

            <Dialog open={!!pendingDeleteRole} onClose={() => setPendingDeleteId(null)}>
                <DialogTitle>Delete primary role?</DialogTitle>
                <DialogContent>
                    <DialogContentText>
                        Remove “{pendingDeleteRole?.name}” from the primary role list? Existing people keep their saved
                        role; only new people lose the option.
                    </DialogContentText>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setPendingDeleteId(null)}>Keep</Button>
                    <Button color="error" onClick={() => pendingDeleteId && void softDelete(pendingDeleteId)}>
                        Delete
                    </Button>
                </DialogActions>
            </Dialog>

            <RoundedContainer title="Primary Roles">
                <Stack spacing={1}>
                    {!primaryRolesRes.isLoading && roleList.length === 0 && (
                        <Box sx={{ color: 'text.secondary', fontStyle: 'italic' }}>
                            No primary role options yet.
                        </Box>
                    )}
                    {roleList.map((role, index) => (
                        <Box
                            key={role.id}
                            sx={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: 1,
                                border: '1px solid lightgray',
                                borderRadius: 1,
                                px: 1,
                                py: 0.5,
                            }}
                        >
                            <Box sx={{ flex: 1 }}>{role.name}</Box>
                            <IconButton
                                size="small"
                                onClick={() => void move(role, -1)}
                                disabled={index === 0}
                                aria-label={`Move ${role.name} up`}
                            >
                                <ArrowUpward fontSize="small" />
                            </IconButton>
                            <IconButton
                                size="small"
                                onClick={() => void move(role, 1)}
                                disabled={index === roleList.length - 1}
                                aria-label={`Move ${role.name} down`}
                            >
                                <ArrowDownward fontSize="small" />
                            </IconButton>
                            <IconButton
                                size="small"
                                onClick={() => startEdit(role)}
                                aria-label={`Edit ${role.name}`}
                            >
                                <Edit fontSize="small" />
                            </IconButton>
                            <IconButton
                                size="small"
                                onClick={() => setPendingDeleteId(role.id)}
                                aria-label={`Delete ${role.name}`}
                            >
                                <Delete fontSize="small" />
                            </IconButton>
                        </Box>
                    ))}
                    <Box>
                        <Button size="small" startIcon={<Add />} onClick={() => void addNew()}>
                            Add primary role
                        </Button>
                    </Box>
                </Stack>
            </RoundedContainer>
        </>
    )
}
