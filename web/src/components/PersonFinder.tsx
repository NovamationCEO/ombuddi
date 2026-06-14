import { Box, Button, CircularProgress, Paper, TextField } from '@mui/material'
import React from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { useGetter } from '../tools/db_tools/useGetter'
import { PersonType } from '../types/majorTypes'
import { useHashName } from '../tools/useHashName'
import './PersonFinder.css'
import { useNavigate } from 'react-router-dom'
import { useSessionSalt } from '../libraries/useSessionSalt'

export function PersonFinder(props: {
    /** Called when the ombuds clicks Select on a matching person. */
    onSelect?: (person: PersonType) => void
    /**
     * Called when the ombuds clicks "Create new user" with no matches. The
     * typed name is passed through so callers can pre-fill it. If omitted,
     * the finder navigates to `/add_person` instead.
     */
    onCreateRequest?: (name: string) => void
}) {
    const { onSelect, onCreateRequest } = props
    const [name, setName] = React.useState<string>('')
    const sessionSalt = useSessionSalt((s) => s.sessionSalt)
    const [salt, setSalt] = React.useState<string>('')
    const [searched, setSearched] = React.useState(false)
    const navigate = useNavigate()
    const queryClient = useQueryClient()

    React.useEffect(() => {
        if (sessionSalt !== null && salt === '') setSalt(sessionSalt)
    }, [sessionSalt])

    const hashedName = useHashName(name, salt)
    const personRes = useGetter<PersonType[]>(['get_persons_by_hashed_name', hashedName])

    // Reset the revealed state whenever the search fields change.
    React.useEffect(() => {
        setSearched(false)
    }, [name, salt])

    async function revealSearch() {
        // Force a fresh fetch so a newly-created person is found even if the
        // cache still holds the empty result from before they were created.
        await queryClient.invalidateQueries({ queryKey: ['get_persons_by_hashed_name', hashedName] })
        setSearched(true)
    }

    function handleSelect(person: PersonType) {
        onSelect?.(person)
        setName('')
        setSalt('')
        setSearched(false)
    }

    const results = personRes.data ?? []
    const showResults = searched && name.length > 0

    return (
        <Paper
            elevation={3}
            className="person-finder"
        >
            <Box>Person Finder</Box>
            <div className="search-panel">
                <TextField
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    label="Full Name"
                    InputLabelProps={{ shrink: true }}
                    placeholder="Enter full name"
                />
                <TextField
                    value={salt}
                    onChange={(e) => setSalt(e.target.value)}
                    label="Salt Phrase"
                    InputLabelProps={{ shrink: true }}
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
                    height: showResults ? 80 : 0,
                    overflow: 'hidden',
                    transition: 'height 0.3s ease-in-out',
                }}
            >
                {personRes.isFetching ? (
                    <Box sx={{ display: 'flex', alignItems: 'center', height: '100%', pl: 1 }}>
                        <CircularProgress size={20} />
                    </Box>
                ) : results.length > 0 ? (
                    results.map((person) => (
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
                                }}
                            >
                                <Box sx={{ flex: 1 }}>{person.gender}</Box>
                                <Box sx={{ flex: 1 }}>{person.generation}</Box>
                                <Box sx={{ flex: 1 }}>{person.primaryRole}</Box>
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
                        ✚ Create new user "{name}"
                    </div>
                )}
            </Box>
        </Paper>
    )
}
