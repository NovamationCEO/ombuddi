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

    React.useEffect(() => {
        if (sessionSalt !== null && salt === '') setSalt(sessionSalt)
    }, [sessionSalt])

    const hashedName = useHashName(name, salt)
    const personRes = useGetter<PersonType[]>(['get_persons_by_hashed_name', hashedName])

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
