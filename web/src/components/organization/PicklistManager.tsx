import React from 'react'
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
import { Add, ArrowDownward, ArrowUpward, Delete, Edit } from '@mui/icons-material'
import { RoundedContainer } from '../RoundedContainer'
import { usePicklists } from '../../tools/usePicklists'
import { useOrganization } from '../../tools/useOrganization'
import { PicklistType } from '../../types/majorTypes'
import { creator } from '../../tools/db_tools/creator'
import { updater } from '../../tools/db_tools/updater'

/**
 * Generic CRUD + reorder UI for a single picklist kind. Drop multiple
 * instances on the Organization page (e.g. one for 'medium', one for
 * 'priority'). The component is intentionally narrow: list, add, rename,
 * reorder, soft-delete. No drag-and-drop yet — up/down arrow buttons.
 */
export function PicklistManager(props: {
    /** Discriminator passed straight to usePicklists. */
    kind: string
    /** Title displayed at the top of the RoundedContainer. */
    title: string
    /** Used in the empty state and dialog copy, e.g. "medium" or "priority". */
    singularNoun: string
}) {
    const { kind, title, singularNoun } = props
    const organization = useOrganization()
    const picklists = usePicklists(kind)

    // Edit-name dialog state.
    const [editingId, setEditingId] = React.useState<string | null>(null)
    const [editingName, setEditingName] = React.useState('')
    const editingItem = picklists.items.find((p) => p.id === editingId) ?? null

    // Delete-confirm dialog state.
    const [pendingDeleteId, setPendingDeleteId] = React.useState<string | null>(null)
    const pendingDeleteItem = picklists.items.find((p) => p.id === pendingDeleteId) ?? null

    function startEdit(item: PicklistType) {
        setEditingId(item.id)
        setEditingName(item.name)
    }

    async function commitRename() {
        if (!editingItem) return
        await updater<PicklistType>('update_picklist', {
            id: editingItem.id,
            name: editingName,
        })
        picklists.refetch()
        setEditingId(null)
    }

    async function addNew() {
        if (!organization?.id) return
        const nextIndex = picklists.items.length
        await creator<PicklistType>('add_picklist', {
            organizationId: organization.id,
            kind,
            name: `New ${singularNoun}`,
            index: nextIndex,
            softDelete: false,
        })
        picklists.refetch()
    }

    async function softDelete(id: string) {
        await updater<PicklistType>('update_picklist', { id, softDelete: true })
        picklists.refetch()
        setPendingDeleteId(null)
    }

    async function move(item: PicklistType, direction: -1 | 1) {
        const i = picklists.items.findIndex((p) => p.id === item.id)
        const j = i + direction
        if (j < 0 || j >= picklists.items.length) return
        const other = picklists.items[j]
        await Promise.all([
            updater<PicklistType>('update_picklist', { id: item.id, index: other.index }),
            updater<PicklistType>('update_picklist', { id: other.id, index: item.index }),
        ])
        picklists.refetch()
    }

    return (
        <>
            <Dialog
                open={!!editingItem}
                onClose={() => setEditingId(null)}
            >
                <DialogTitle>Rename {singularNoun}</DialogTitle>
                <DialogContent>
                    <TextField
                        value={editingName}
                        onChange={(e) => setEditingName(e.target.value)}
                        fullWidth
                        autoFocus
                        sx={{ mt: 1 }}
                    />
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setEditingId(null)}>Cancel</Button>
                    <Button
                        variant={'contained'}
                        onClick={commitRename}
                    >
                        Save
                    </Button>
                </DialogActions>
            </Dialog>
            <Dialog
                open={!!pendingDeleteItem}
                onClose={() => setPendingDeleteId(null)}
            >
                <DialogTitle>Delete {singularNoun}?</DialogTitle>
                <DialogContent>
                    <DialogContentText>
                        Remove "{pendingDeleteItem?.name}" from the {singularNoun} list? Existing
                        entries that already chose this {singularNoun} keep their value; only new
                        entries lose the option.
                    </DialogContentText>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setPendingDeleteId(null)}>Keep</Button>
                    <Button
                        color={'error'}
                        onClick={() => pendingDeleteId && softDelete(pendingDeleteId)}
                    >
                        Delete
                    </Button>
                </DialogActions>
            </Dialog>
            <RoundedContainer title={title}>
                <Stack spacing={1}>
                    {picklists.items.length === 0 && (
                        <Box sx={{ color: 'text.secondary', fontStyle: 'italic' }}>
                            No {singularNoun} options yet.
                        </Box>
                    )}
                    {picklists.items.map((item, idx) => (
                        <Box
                            key={item.id}
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
                            <Box sx={{ flex: 1 }}>{item.name}</Box>
                            <IconButton
                                size={'small'}
                                onClick={() => move(item, -1)}
                                disabled={idx === 0}
                            >
                                <ArrowUpward fontSize={'small'} />
                            </IconButton>
                            <IconButton
                                size={'small'}
                                onClick={() => move(item, 1)}
                                disabled={idx === picklists.items.length - 1}
                            >
                                <ArrowDownward fontSize={'small'} />
                            </IconButton>
                            <IconButton
                                size={'small'}
                                onClick={() => startEdit(item)}
                            >
                                <Edit fontSize={'small'} />
                            </IconButton>
                            <IconButton
                                size={'small'}
                                onClick={() => setPendingDeleteId(item.id)}
                            >
                                <Delete fontSize={'small'} />
                            </IconButton>
                        </Box>
                    ))}
                    <Box>
                        <Button
                            size={'small'}
                            startIcon={<Add />}
                            onClick={addNew}
                        >
                            Add {singularNoun}
                        </Button>
                    </Box>
                </Stack>
            </RoundedContainer>
        </>
    )
}
