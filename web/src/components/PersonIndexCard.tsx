import { Add, Close, LockOutlined } from '@mui/icons-material'
import { Box, ButtonBase, IconButton, Tooltip, Typography } from '@mui/material'
import type { PersonType } from '../types/majorTypes'
import { PersonAvatar } from './PersonAvatar'
import './PersonIndexCard.css'

export function PersonIndexCard({
    person,
    onOpen,
    onAdd,
    onRemove,
    selected = false,
}: {
    person: PersonType
    onOpen: () => void
    onAdd?: () => void
    onRemove?: () => void
    selected?: boolean
}) {
    const summary =
        [person.primaryRole, person.generation]
            .filter((value) => value && !['unknown', 'n/a'].includes(value.toLowerCase()))
            .join(' · ') || 'Visitor'
    return (
        <Box
            className={`person-index-card person-summary-card${selected ? ' person-card-selected' : ''}`}
            sx={{ display: 'flex', alignItems: 'center', minWidth: 0 }}
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
        </Box>
    )
}
