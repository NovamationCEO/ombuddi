import { Box, Button, Paper, TextField } from '@mui/material'
import React from 'react'
import { useGetter } from '../tools/db_tools/useGetter'
import { PersonType } from '../types/majorTypes'
import { useHashName } from '../tools/useHashName'
import './PersonFinder.css'
import { useNavigate } from 'react-router-dom'

export function PersonFinder(props: {
    /** Called when the ombuds clicks Select on a matching person. */
    onSelect?: (person: PersonType) => void
}) {
    const { onSelect } = props
    const [name, setName] = React.useState<string>('')
    const [salt, setSalt] = React.useState<string>('')
    const [results, setResults] = React.useState<PersonType[]>([])
    const hashedName = useHashName(name, salt)
    const [showBottom, setShowBottom] = React.useState<boolean>(false)
    const navigate = useNavigate()

    const personRes = useGetter<PersonType[]>(['get_persons_by_hashed_name', hashedName])

    function revealSearch() {
        setResults(personRes.data || [])
        setShowBottom(true)
    }

    function handleSelect(person: PersonType) {
        onSelect?.(person)
        // Clear the search after a successful pick so the dialog stays usable
        // for adding additional people without re-entering anything from before.
        setName('')
        setSalt('')
        setResults([])
        setShowBottom(false)
    }

    React.useEffect(() => {
        setResults([])
        setShowBottom(false)
    }, [name, salt])

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
                />
                <TextField
                    value={salt}
                    onChange={(e) => setSalt(e.target.value)}
                    label="Salt Phrase"
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
                    height: showBottom && name.length > 0 ? 80 : 0,
                    overflow: 'hidden',
                    transition: 'height 0.3s ease-in-out'
                }}>
                {results.length > 0 ? (
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
                                    alignItems: 'center'
                                }}>
                                <Box sx={{
                                    flex: 1
                                }}>{person.gender}</Box>
                                <Box sx={{
                                    flex: 1
                                }}>{person.generation}</Box>
                                <Box sx={{
                                    flex: 1
                                }}>{person.primaryRole}</Box>
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
                        onClick={() => navigate('/add_person')}
                    >
                        ✚ Create new user “{name}”
                    </div>
                )}
            </Box>
        </Paper>
    );
}
