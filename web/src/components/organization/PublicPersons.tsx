import {
    Box,
    Button,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    IconButton,
    Stack,
    TextField,
    Typography,
} from '@mui/material'
import { Add, Delete, Edit } from '@mui/icons-material'
import React from 'react'
import { RoundedContainer } from '../RoundedContainer'
import { useOrganization } from '../../tools/useOrganization'
import { useGetter } from '../../tools/db_tools/useGetter'
import { creator } from '../../tools/db_tools/creator'
import { updater } from '../../tools/db_tools/updater'
import { deleter } from '../../tools/db_tools/deleter'
import { useSnack } from '../../libraries/useSnack'
import { PersonType } from '../../types/majorTypes'

type DialogMode = 'add' | 'edit' | null

export function PublicPersons() {
    const organization = useOrganization()
    const setSnack = useSnack((state) => state.setSnack)
    const publicPersonsRes = useGetter<PersonType[]>([
        'get_public_persons_by_organization_id',
        organization.id,
    ])

    const [mode, setMode] = React.useState<DialogMode>(null)
    const [editingPerson, setEditingPerson] = React.useState<PersonType | null>(null)
    const [publicName, setPublicName] = React.useState('')
    const [primaryRole, setPrimaryRole] = React.useState('')
    const [pendingDeleteId, setPendingDeleteId] = React.useState<string | null>(null)

    function openAdd() {
        setPublicName('')
        setPrimaryRole('')
        setEditingPerson(null)
        setMode('add')
    }

    function openEdit(person: PersonType) {
        setPublicName(person.publicName ?? '')
        setPrimaryRole(person.primaryRole ?? '')
        setEditingPerson(person)
        setMode('edit')
    }

    function closeDialog() {
        setMode(null)
        setEditingPerson(null)
    }

    async function save() {
        if (!publicName.trim() || !organization.id) return
        try {
            if (mode === 'add') {
                await creator<{ id: string; success: boolean }>('add_person', {
                    publicName: publicName.trim(),
                    primaryRole: primaryRole.trim() || 'unknown',
                    isPublic: true,
                    organizationId: organization.id,
                })
            } else if (mode === 'edit' && editingPerson) {
                await updater<PersonType>('update_person', {
                    id: editingPerson.id,
                    publicName: publicName.trim(),
                    primaryRole: primaryRole.trim() || 'unknown',
                })
            }
            setSnack({ message: 'Saved.', severity: 'success' })
            closeDialog()
            publicPersonsRes.refetch()
        } catch {
            setSnack({ message: 'Failed to save.', severity: 'error' })
        }
    }

    async function confirmDelete() {
        if (!pendingDeleteId) return
        try {
            await deleter<{ id: string }>('delete_person', { id: pendingDeleteId })
            setSnack({ message: 'Person removed.', severity: 'success' })
            publicPersonsRes.refetch()
        } catch {
            setSnack({ message: 'Failed to remove person.', severity: 'error' })
        } finally {
            setPendingDeleteId(null)
        }
    }

    const persons = publicPersonsRes.data ?? []

    return (
        <>
            <RoundedContainer title="Public Persons">
                <Stack spacing={1}>
                    <Typography variant="body2" color="text.secondary">
                        Public persons (managers, administrators, faculty) whose names carry no privacy
                        expectation. Stored with a plaintext name instead of a hash.
                    </Typography>
                    {persons.length === 0 && (
                        <Typography variant="body2" color="text.secondary" sx={{ fontStyle: 'italic' }}>
                            No public persons yet.
                        </Typography>
                    )}
                    {persons.map((p) => (
                        <Box
                            key={p.id}
                            sx={{ display: 'flex', alignItems: 'center', gap: 1 }}
                        >
                            <Box sx={{ flex: 1 }}>
                                <Typography>{p.publicName}</Typography>
                                {p.primaryRole && p.primaryRole !== 'unknown' && (
                                    <Typography variant="caption" color="text.secondary">
                                        {p.primaryRole}
                                    </Typography>
                                )}
                            </Box>
                            <IconButton size="small" onClick={() => openEdit(p)}>
                                <Edit fontSize="small" />
                            </IconButton>
                            <IconButton size="small" onClick={() => setPendingDeleteId(p.id)}>
                                <Delete fontSize="small" />
                            </IconButton>
                        </Box>
                    ))}
                    <Box>
                        <Button startIcon={<Add />} onClick={openAdd} size="small">
                            Add Public Person
                        </Button>
                    </Box>
                </Stack>
            </RoundedContainer>

            {/* Add / Edit dialog */}
            <Dialog open={mode !== null} onClose={closeDialog} fullWidth maxWidth="xs">
                <DialogTitle>{mode === 'add' ? 'Add Public Person' : 'Edit Public Person'}</DialogTitle>
                <DialogContent>
                    <Stack spacing={2} sx={{ mt: 1 }}>
                        <TextField
                            label="Full Name"
                            value={publicName}
                            onChange={(e) => setPublicName(e.target.value)}
                            fullWidth
                            autoFocus
                        />
                        <TextField
                            label="Role (optional)"
                            value={primaryRole}
                            onChange={(e) => setPrimaryRole(e.target.value)}
                            fullWidth
                            placeholder="e.g. Dean of Students"
                        />
                    </Stack>
                </DialogContent>
                <DialogActions>
                    <Button onClick={closeDialog}>Cancel</Button>
                    <Button
                        variant="contained"
                        onClick={save}
                        disabled={!publicName.trim()}
                    >
                        Save
                    </Button>
                </DialogActions>
            </Dialog>

            {/* Delete confirm dialog */}
            <Dialog open={pendingDeleteId !== null} onClose={() => setPendingDeleteId(null)}>
                <DialogTitle>Remove public person?</DialogTitle>
                <DialogContent>
                    <Typography>
                        This removes the person record. Any entries they were attached to will lose the link.
                    </Typography>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setPendingDeleteId(null)}>Cancel</Button>
                    <Button variant="contained" color="error" onClick={confirmDelete}>
                        Remove
                    </Button>
                </DialogActions>
            </Dialog>
        </>
    )
}
