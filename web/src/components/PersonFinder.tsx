import { Box, Button, CircularProgress, Paper, TextField, Typography } from '@mui/material'
import React from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { useGetter } from '../tools/db_tools/useGetter'
import { PersonType } from '../types/majorTypes'
import { useHashName } from '../tools/useHashName'
import { useOrganization } from '../tools/useOrganization'
import './PersonFinder.css'
import { useNavigate } from 'react-router-dom'
import { useSessionSalt } from '../libraries/useSessionSalt'

export function PersonFinder(props: {
    onSelect?: (person: PersonType) => void
    onCreateRequest?: (name: string) => void
    /** When true, renders without the standalone Paper shell — use inside a dialog or card. */
    embedded?: boolean
    /** Increment this to programmatically clear the search fields. */
    clearTrigger?: number
}) {
    const { onSelect, onCreateRequest, embedded, clearTrigger } = props
    const [name, setName] = React.useState<string>('')
    const sessionSalt = useSessionSalt((s) => s.sessionSalt)
    const [salt, setSalt] = React.useState<string>('')
    const [searched, setSearched] = React.useState(false)
    const navigate = useNavigate()
    const queryClient = useQueryClient()
    const organization = useOrganization()
    const orgId = organization?.id

    React.useEffect(() => {
        if (sessionSalt !== null && salt === '') setSalt(sessionSalt)
    }, [sessionSalt])

    const hashedName = useHashName(name, salt)

    // Private persons: exact hash match
    const privateRes = useGetter<PersonType[]>(['get_persons_by_hashed_name', hashedName])

    // Public persons: partial name match via backend ILIKE — only fires when orgId + name ready
    const trimmedName = name.trim()
    const publicRes = useGetter<PersonType[]>(
        ['search_public_persons', orgId, trimmedName],
        false, // no retry on 404
    )

    React.useEffect(() => {
        setSearched(false)
    }, [name, salt])

    React.useEffect(() => {
        if (clearTrigger === undefined) return
        setName('')
        setSalt(sessionSalt ?? '')
        setSearched(false)
    }, [clearTrigger])

    async function revealSearch() {
        await Promise.all([
            queryClient.invalidateQueries({ queryKey: ['get_persons_by_hashed_name', hashedName] }),
            queryClient.invalidateQueries({ queryKey: ['search_public_persons', orgId, trimmedName] }),
        ])
        setSearched(true)
    }

    function handleSelect(person: PersonType) {
        onSelect?.(person)
        setName('')
        setSalt('')
        setSearched(false)
    }

    const privateMatches = privateRes.data ?? []
    const publicMatches = (publicRes.data ?? []).filter(
        (pub) => !privateMatches.some((priv) => priv.id === pub.id),
    )
    const allResults = [...privateMatches, ...publicMatches]
    const isFetching = privateRes.isFetching || publicRes.isFetching
    const showResults = searched && trimmedName.length > 0

    const inner = (
        <>
            <div className="search-panel">
                <TextField
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    label="Full Name"
                    slotProps={{ inputLabel: { shrink: true } }}
                    placeholder="Enter full name"
                />
                <TextField
                    value={salt}
                    onChange={(e) => setSalt(e.target.value)}
                    label="Salt Phrase"
                    slotProps={{ inputLabel: { shrink: true } }}
                    placeholder="Enter salt phrase"
                />
                <Button
                    variant="contained"
                    onClick={revealSearch}
                >
                    Search
                </Button>
            </div>
            <Box
                sx={{
                    maxHeight: showResults ? 300 : 0,
                    overflow: 'hidden',
                    transition: 'max-height 0.3s ease-in-out',
                }}
            >
                {isFetching ? (
                    <Box sx={{ display: 'flex', alignItems: 'center', p: 1 }}>
                        <CircularProgress size={20} />
                    </Box>
                ) : allResults.length > 0 ? (
                    allResults.map((person) => (
                        <div
                            key={person.id}
                            className="result-item"
                        >
                            <Box
                                sx={{
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    width: '100%',
                                    alignItems: 'center',
                                    gap: 1,
                                }}
                            >
                                {person.isPublic ? (
                                    <Typography
                                        variant="body2"
                                        sx={{ flex: 1, fontWeight: 500 }}
                                    >
                                        {person.publicName}
                                    </Typography>
                                ) : (
                                    <>
                                        <Box sx={{ flex: 1 }}>{person.gender}</Box>
                                        <Box sx={{ flex: 1 }}>{person.generation}</Box>
                                        <Box sx={{ flex: 1 }}>{person.primaryRole}</Box>
                                    </>
                                )}
                                <Button
                                    size="small"
                                    onClick={() => handleSelect(person)}
                                >
                                    Select
                                </Button>
                            </Box>
                        </div>
                    ))
                ) : (
                    <div
                        className="result-item create"
                        onClick={() =>
                            onCreateRequest ? onCreateRequest(name) : navigate('/add_person')
                        }
                    >
                        ✚ Create new person "{name}"
                    </div>
                )}
            </Box>
        </>
    )

    if (embedded) {
        return <Box className="person-finder-embedded">{inner}</Box>
    }

    return (
        <Paper
            elevation={3}
            className="person-finder"
        >
            <Box>Person Finder</Box>
            {inner}
        </Paper>
    )
}
