import React from 'react'
import {
    Box,
    Button,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    DialogContentText,
    FormControlLabel,
    IconButton,
    List,
    ListItem,
    ListItemText,
    Radio,
    RadioGroup,
    Stack,
    TextField,
    Typography,
} from '@mui/material'
import { Add, ArrowDownward, ArrowUpward, Delete, Edit, Restore } from '@mui/icons-material'
import { RoundedContainer } from '../RoundedContainer'
import { usePicklists } from '../../tools/usePicklists'
import { useOrganization } from '../../tools/useOrganization'
import { PicklistType } from '../../types/majorTypes'
import { creator } from '../../tools/db_tools/creator'
import { updater } from '../../tools/db_tools/updater'
import { useSnack } from '../../libraries/useSnack'

export type DefaultSetItem = { name: string; description: string }

export type DefaultSet = {
    /** Short label shown in the picker radio list. */
    label: string
    /** Optional sentence shown beneath the label in the picker. */
    description?: string
    items: DefaultSetItem[]
}

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
    /**
     * Named preset packs surfaced via a "Load defaults" picker dialog.
     * Pass one or more DefaultSet objects; the picker grows automatically
     * as new packs are added. Items whose names already exist in the live
     * list are skipped (idempotent).
     */
    defaultSets?: DefaultSet[]
}) {
    const { kind, title, singularNoun, defaultSets } = props
    const organization = useOrganization()
    const picklists = usePicklists(kind)
    const setSnack = useSnack((s) => s.setSnack)

    // Edit dialog state.
    const [editingId, setEditingId] = React.useState<string | null>(null)
    const [editingName, setEditingName] = React.useState('')
    const [editingDescription, setEditingDescription] = React.useState('')
    const editingItem = picklists.items.find((p) => p.id === editingId) ?? null

    // Delete-confirm dialog state.
    const [pendingDeleteId, setPendingDeleteId] = React.useState<string | null>(null)
    const pendingDeleteItem = picklists.items.find((p) => p.id === pendingDeleteId) ?? null

    // Load-defaults picker dialog state.
    const [pickerOpen, setPickerOpen] = React.useState(false)
    const [selectedSetIdx, setSelectedSetIdx] = React.useState(0)
    const [loadingDefaults, setLoadingDefaults] = React.useState(false)

    const selectedSet = defaultSets?.[selectedSetIdx]

    function openPicker() {
        setSelectedSetIdx(0)
        setPickerOpen(true)
    }

    function startEdit(item: PicklistType) {
        setEditingId(item.id)
        setEditingName(item.name)
        setEditingDescription(item.description ?? '')
    }

    async function commitEdit() {
        if (!editingItem) return
        try {
            await updater<PicklistType>('update_picklist', {
                id: editingItem.id,
                name: editingName,
                description: editingDescription,
            })
            picklists.refetch()
            setEditingId(null)
        } catch (e) {
            setSnack({ message: e instanceof Error ? e.message : 'Failed to save changes', severity: 'error' })
        }
    }

    async function addNew() {
        if (!organization?.id) return
        const nextIndex = picklists.items.length
        try {
            await creator('add_picklist', {
                organizationId: organization.id,
                kind,
                name: `New ${singularNoun}`,
                description: '',
                index: nextIndex,
                softDelete: false,
            })
            picklists.refetch()
        } catch (e) {
            setSnack({ message: e instanceof Error ? e.message : `Failed to add ${singularNoun}`, severity: 'error' })
        }
    }

    async function commitLoadDefaults() {
        if (!organization?.id || !selectedSet) return
        setLoadingDefaults(true)
        let added = 0
        const startIndex = picklists.items.length
        try {
            for (let i = 0; i < selectedSet.items.length; i++) {
                try {
                    await creator('add_picklist', {
                        organizationId: organization.id,
                        kind,
                        name: selectedSet.items[i].name,
                        description: selectedSet.items[i].description,
                        index: startIndex + i,
                        softDelete: false,
                    })
                    added++
                } catch {
                    // Unique-constraint violation = item already exists; skip it.
                }
            }
            picklists.refetch()
            const skipped = selectedSet.items.length - added
            const msg = skipped > 0
                ? `Loaded ${added} option${added !== 1 ? 's' : ''} (${skipped} already existed).`
                : `Loaded ${added} option${added !== 1 ? 's' : ''}.`
            setSnack({ message: msg, severity: 'success' })
            setPickerOpen(false)
        } finally {
            setLoadingDefaults(false)
        }
    }

    async function softDelete(id: string) {
        try {
            await updater<PicklistType>('update_picklist', { id, softDelete: true })
            picklists.refetch()
            setPendingDeleteId(null)
        } catch (e) {
            setSnack({ message: e instanceof Error ? e.message : 'Failed to delete', severity: 'error' })
        }
    }

    async function move(item: PicklistType, direction: -1 | 1) {
        const i = picklists.items.findIndex((p) => p.id === item.id)
        const j = i + direction
        if (j < 0 || j >= picklists.items.length) return
        const other = picklists.items[j]
        try {
            await Promise.all([
                updater<PicklistType>('update_picklist', { id: item.id, index: other.index }),
                updater<PicklistType>('update_picklist', { id: other.id, index: item.index }),
            ])
            picklists.refetch()
        } catch (e) {
            setSnack({ message: e instanceof Error ? e.message : 'Failed to reorder', severity: 'error' })
        }
    }

    return (
        <>
            {/* ── Edit item dialog ───────────────────────────────────── */}
            <Dialog open={!!editingItem} onClose={() => setEditingId(null)}>
                <DialogTitle>Edit {singularNoun}</DialogTitle>
                <DialogContent>
                    <Stack spacing={2} sx={{ mt: 1 }}>
                        <TextField
                            label="Name"
                            value={editingName}
                            onChange={(e) => setEditingName(e.target.value)}
                            fullWidth
                            autoFocus
                        />
                        <TextField
                            label="Tooltip / description (optional)"
                            value={editingDescription}
                            onChange={(e) => setEditingDescription(e.target.value)}
                            fullWidth
                            placeholder="Shown as a tooltip when users hover this option"
                        />
                    </Stack>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setEditingId(null)}>Cancel</Button>
                    <Button variant="contained" onClick={commitEdit}>Save</Button>
                </DialogActions>
            </Dialog>

            {/* ── Delete-confirm dialog ──────────────────────────────── */}
            <Dialog open={!!pendingDeleteItem} onClose={() => setPendingDeleteId(null)}>
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
                    <Button color="error" onClick={() => pendingDeleteId && softDelete(pendingDeleteId)}>
                        Delete
                    </Button>
                </DialogActions>
            </Dialog>

            {/* ── Load-defaults picker dialog ────────────────────────── */}
            {defaultSets && (
                <Dialog open={pickerOpen} onClose={() => setPickerOpen(false)} maxWidth="xs" fullWidth>
                    <DialogTitle>Load default {title.toLowerCase()}</DialogTitle>
                    <DialogContent>
                        <Stack spacing={2}>
                            {defaultSets.length > 1 && (
                                <RadioGroup
                                    value={selectedSetIdx}
                                    onChange={(e) => setSelectedSetIdx(Number(e.target.value))}
                                >
                                    {defaultSets.map((set, i) => (
                                        <Box key={i}>
                                            <FormControlLabel
                                                value={i}
                                                control={<Radio />}
                                                label={set.label}
                                            />
                                            {set.description && (
                                                <Typography
                                                    variant="caption"
                                                    color="text.secondary"
                                                    sx={{ display: 'block', ml: 4, mt: -0.5, mb: 0.5 }}
                                                >
                                                    {set.description}
                                                </Typography>
                                            )}
                                        </Box>
                                    ))}
                                </RadioGroup>
                            )}
                            {selectedSet && (
                                <Box>
                                    {defaultSets.length === 1 && (
                                        <Typography variant="subtitle2" sx={{ mb: 0.5 }}>
                                            {selectedSet.label}
                                        </Typography>
                                    )}
                                    {selectedSet.description && defaultSets.length === 1 && (
                                        <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                                            {selectedSet.description}
                                        </Typography>
                                    )}
                                    <List dense disablePadding>
                                        {selectedSet.items.map((item) => (
                                            <ListItem key={item.name} disableGutters sx={{ py: 0.25 }}>
                                                <ListItemText
                                                    primary={item.name}
                                                    secondary={item.description || undefined}
                                                    slotProps={{
                                                        primary: { variant: 'body2' } as object,
                                                        secondary: { variant: 'caption' } as object,
                                                    }}
                                                />
                                            </ListItem>
                                        ))}
                                    </List>

                                </Box>
                            )}
                        </Stack>
                    </DialogContent>
                    <DialogActions>
                        <Button onClick={() => setPickerOpen(false)}>Cancel</Button>
                        <Button
                            variant="contained"
                            onClick={commitLoadDefaults}
                            disabled={loadingDefaults || !selectedSet}
                        >
                            {loadingDefaults ? 'Loading…' : 'Load'}
                        </Button>
                    </DialogActions>
                </Dialog>
            )}

            {/* ── Main list ─────────────────────────────────────────── */}
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
                            <Box sx={{ flex: 1 }}>
                                <Box>{item.name}</Box>
                                {item.description && (
                                    <Typography variant="caption" color="text.secondary" sx={{ fontStyle: 'italic' }}>
                                        {item.description}
                                    </Typography>
                                )}
                            </Box>
                            <IconButton size="small" onClick={() => move(item, -1)} disabled={idx === 0}>
                                <ArrowUpward fontSize="small" />
                            </IconButton>
                            <IconButton size="small" onClick={() => move(item, 1)} disabled={idx === picklists.items.length - 1}>
                                <ArrowDownward fontSize="small" />
                            </IconButton>
                            <IconButton size="small" onClick={() => startEdit(item)}>
                                <Edit fontSize="small" />
                            </IconButton>
                            <IconButton size="small" onClick={() => setPendingDeleteId(item.id)}>
                                <Delete fontSize="small" />
                            </IconButton>
                        </Box>
                    ))}
                    <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                        <Button size="small" startIcon={<Add />} onClick={addNew}>
                            Add {singularNoun}
                        </Button>
                        {defaultSets && !picklists.isLoading && picklists.items.length === 0 && (
                            <Button size="small" startIcon={<Restore />} onClick={openPicker}>
                                Load defaults
                            </Button>
                        )}
                    </Box>
                </Stack>
            </RoundedContainer>
        </>
    )
}
