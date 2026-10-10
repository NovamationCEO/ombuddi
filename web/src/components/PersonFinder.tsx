import { Alert, Box, Button, CircularProgress, Stack, TextField, Typography } from '@mui/material'
import React from 'react'
import { useOrganization } from '../tools/useOrganization'
import type { PersonType } from '../types/majorTypes'
import { findPeople, type PersonCredentials } from '../tools/personLookup'
import { PersonPhraseField } from './PersonPhraseField'
import { PersonIndexCard } from './PersonIndexCard'
import { PersonCardDialog } from './PersonCardDialog'
import './PersonIndexCard.css'

export function PersonFinder({
    onSelect,
    onUpdate,
    onCreateRequest,
    embedded,
    clearTrigger,
}: {
    onSelect?: (person: PersonType) => void
    onUpdate?: (person: PersonType) => void
    onCreateRequest?: (credentials: PersonCredentials) => void
    embedded?: boolean
    clearTrigger?: number
}) {
    const [name, setName] = React.useState('')
    const [phrase, setPhrase] = React.useState('')
    const [results, setResults] = React.useState<PersonType[] | null>(null)
    const [error, setError] = React.useState('')
    const [busy, setBusy] = React.useState(false)
    const [opened, setOpened] = React.useState<PersonType | null>(null)
    const requestId = React.useRef(0)
    const organization = useOrganization()
    const orgId = organization.id
    React.useEffect(() => {
        requestId.current++
        setResults(null)
        setError('')
        setBusy(false)
    }, [name, phrase, orgId])
    React.useEffect(() => {
        setName('')
        setPhrase('')
        setResults(null)
        return () => {
            requestId.current++
        }
    }, [clearTrigger])

    async function search(event: React.FormEvent) {
        event.preventDefault()
        if (!name.trim() || !orgId || busy) return
        const attempt = ++requestId.current
        setBusy(true)
        setError('')
        setResults(null)
        try {
            const matches = await findPeople({ name: name.trim(), phrase }, orgId)
            if (requestId.current === attempt) setResults(matches)
        } catch {
            if (requestId.current === attempt)
                setError('The search could not be completed. Please try again before creating a person.')
        } finally {
            if (requestId.current === attempt) setBusy(false)
        }
    }
    return (
        <Box className={embedded ? undefined : 'people-search-card'}>
            <Typography
                component="h3"
                className="people-section-label"
            >
                Find a person
            </Typography>
            <Typography
                variant="body2"
                color="text.secondary"
                sx={{ mb: 2 }}
            >
                Search with the full name and phrase before adding someone new.
            </Typography>
            <Box
                component="form"
                onSubmit={search}
                className="people-search-fields"
            >
                <TextField
                    label="Full Name"
                    variant="standard"
                    value={name}
                    onChange={(event) => setName(event.target.value)}
                    fullWidth
                    autoComplete="off"
                />
                <PersonPhraseField
                    value={phrase}
                    onChange={setPhrase}
                />
                <Button
                    type="submit"
                    variant="contained"
                    disabled={busy || !name.trim() || !orgId}
                    sx={{ mt: 1 }}
                >
                    {busy ? (
                        <CircularProgress
                            size={22}
                            color="inherit"
                        />
                    ) : (
                        'Find person'
                    )}
                </Button>
            </Box>
            {error && (
                <Alert
                    severity="error"
                    sx={{ mt: 2 }}
                >
                    {error}
                </Alert>
            )}
            {results && (
                <Stack
                    spacing={2}
                    sx={{ mt: 2 }}
                    aria-live="polite"
                >
                    {results.length ? (
                        <>
                            <Typography variant="body2">Matching people</Typography>
                            <Box className="people-card-grid">
                                {results.map((person) => (
                                    <PersonIndexCard
                                        key={person.id}
                                        person={person}
                                        onOpen={() => setOpened(person)}
                                        onAdd={onSelect ? () => onSelect(person) : undefined}
                                    />
                                ))}
                            </Box>
                        </>
                    ) : (
                        <>
                            <Typography variant="body2">No matching person found.</Typography>
                            {onCreateRequest && (
                                <Button
                                    variant="outlined"
                                    sx={{ alignSelf: 'flex-start' }}
                                    onClick={() => onCreateRequest({ name: name.trim(), phrase })}
                                >
                                    Create new person
                                </Button>
                            )}
                        </>
                    )}
                </Stack>
            )}
            {opened && (
                <PersonCardDialog
                    person={opened}
                    initialName={name.trim()}
                    onClose={() => setOpened(null)}
                    onSaved={(person) => {
                        setResults(null)
                        onUpdate?.(person)
                        setOpened(person)
                    }}
                />
            )}
        </Box>
    )
}
