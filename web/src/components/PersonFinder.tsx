import { Button, Stack, TextField } from '@mui/material'
import { Box } from '@mui/system'
import React from 'react'
import { useGetter } from '../tools/db_tools/useGetter'
import { PersonType } from '../types/majorTypes'
import { useHashName } from '../tools/useHashName'

export function PersonFinder() {
    const [name, setName] = React.useState<string>('')
    const [salt, setSalt] = React.useState<string>('')
    const [results, setResults] = React.useState<PersonType[]>([])
    const hashedName = useHashName(name, salt)

    const personRes = useGetter<PersonType[]>(['get_persons_by_hashed_name', hashedName])

    function revealSearch() {
        setResults(personRes.data || [])
    }

    React.useEffect(() => {
        setResults([])
    }, [name, salt])

    return (
        <Stack spacing={2}>
            <Stack spacing={2}>
                <TextField
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    label={'Full Name'}
                />
                <TextField
                    value={salt}
                    onChange={(e) => setSalt(e.target.value)}
                    label={'Salt Phrase'}
                />
                <Button
                    variant={'contained'}
                    onClick={revealSearch}
                >
                    Search
                </Button>
            </Stack>
            <Box bgcolor={'white'}>
                <Stack spacing={2}>
                    {results.map((person) => (
                        <Box key={person.id}>{person.gender}</Box>
                    ))}
                </Stack>
            </Box>
        </Stack>
    )
}
