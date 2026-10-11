import { Add, Close, LockOutlined } from '@mui/icons-material'
import { Box, ButtonBase, IconButton, MenuItem, TextField, Tooltip, Typography } from '@mui/material'
import type { PersonType } from '../types/majorTypes'
import { entryRoles, type EntryRole } from '../tools/entryRoles'
import { PersonAvatar } from './PersonAvatar'
import './PersonIndexCard.css'

export function PersonIndexCard({
    person,
    onOpen,
    onAdd,
    onRemove,
    selected = false,
    entryRole = 'visitor',
    onRoleChange,
}: {
    person: PersonType
    onOpen: () => void
    onAdd?: () => void
    onRemove?: () => void
    selected?: boolean
    entryRole?: EntryRole
    onRoleChange?: (role: EntryRole) => void
}) {
    const summary =
        [person.primaryRole, person.generation]
            .filter((value) => value && !['unknown', 'n/a'].includes(value.toLowerCase()))
            .join(' · ') || 'Person'
    return (
        <Box
            className={`person-index-card person-summary-card${selected ? ' person-card-selected' : ''}`}
            sx={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', minWidth: 0 }}
        >
            <ButtonBase
                onClick={onOpen}
                aria-current={selected ? 'true' : undefined}
                aria-label={`Open person card: ${person.publicName || summary}`}
                sx={{
                    p: 1.5,
                    gap: 1.25,
                    flex: 1,
                    justifyContent: 'flex-start',
                    textAlign: 'left',
                    minWidth: 0,
                    minHeight: 100,
                    pt: 3,
                }}
            >
                <PersonAvatar
                    person={person}
                    size={52}
                />
                <Box sx={{ minWidth: 0 }}>
                    <Typography
                        variant="body2"
                        sx={{ overflowWrap: 'anywhere', fontWeight: 600 }}
                    >
                        {person.isPublic ? person.publicName : summary}
                    </Typography>
                    <Typography
                        variant="caption"
                        sx={{ display: 'flex', alignItems: 'center', gap: 0.5, color: 'text.secondary', mt: 0.5 }}
                    >
                        {!person.isPublic && <LockOutlined sx={{ fontSize: 13 }} />}
                        {person.isPublic ? 'Public person' : 'Open card'}
                    </Typography>
                </Box>
            </ButtonBase>
            {(onAdd || onRemove) && (
                <Tooltip title={onRemove ? 'Remove from entry' : 'Add to entry'}>
                    <IconButton
                        size="small"
                        sx={{ mr: 1 }}
                        aria-label={`${onRemove ? 'Remove from' : 'Add to'} entry: ${summary}`}
                        onClick={onRemove || onAdd}
                    >
                        {onRemove ? <Close fontSize="small" /> : <Add fontSize="small" />}
                    </IconButton>
                </Tooltip>
            )}
            {onRoleChange && (
                <TextField
                    select
                    variant="standard"
                    label="Role in this entry"
                    value={entryRole}
                    onChange={(event) => onRoleChange(event.target.value as EntryRole)}
                    helperText={entryRoles.find((role) => role.value === entryRole)?.description}
                    sx={{
                        width: '100%',
                        mx: 1.5,
                        mb: 1.5,
                        '& .MuiInputBase-root': { fontSize: '0.85rem' },
                        '& .MuiFormHelperText-root': { fontSize: '0.7rem', lineHeight: 1.35 },
                    }}
                >
                    {entryRoles.map((role) => (
                        <MenuItem
                            key={role.value}
                            value={role.value}
                        >
                            {role.label}
                        </MenuItem>
                    ))}
                </TextField>
            )}
        </Box>
    )
}
