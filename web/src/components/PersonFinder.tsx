import { Box, Button, Paper, TextField } from '@mui/material'
import React from 'react'
import { useGetter } from '../tools/db_tools/useGetter'
import { PersonType } from '../types/majorTypes'
import { useHashName } from '../tools/useHashName'
import './PersonFinder.css'

export function PersonFinder() {
    const [name, setName] = React.useState<string>('')
    const [salt, setSalt] = React.useState<string>('')
    const [results, setResults] = React.useState<PersonType[]>([])
    const hashedName = useHashName(name, salt)
    const [showBottom, setShowBottom] = React.useState<boolean>(false)

    const personRes = useGetter<PersonType[]>(['get_persons_by_hashed_name', hashedName])

    function revealSearch() {
        setResults(personRes.data || [])
        setShowBottom(true)
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
                height={showBottom ? 80 : 0}
                overflow={'hidden'}
                sx={{ transition: 'height 0.3s ease-in-out' }}
            >
                {results.length > 0 ? (
                    results.map((person) => (
                        <div
                            key={person.id}
                            className="result-item"
                        >
                            <Box
                                display={'flex'}
                                justifyContent={'space-between'}
                                width={'100%'}
                                alignItems={'center'}
                            >
                                <Box flex={1}>{person.gender}</Box>
                                <Box flex={1}>{person.generation}</Box>
                                <Box flex={1}>{person.primaryRole}</Box>
                                <Button size="small">Select</Button>
                            </Box>
                        </div>
                    ))
                ) : (
                    <div
                        className="result-item create"
                        onClick={() => null}
                    >
                        ✚ Create new user “{name}”
                    </div>
                )}
            </Box>
        </Paper>
    )
}
