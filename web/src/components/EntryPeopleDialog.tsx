import { Box, Button, Dialog, DialogContent, DialogTitle, Stack, Typography } from '@mui/material'
import { ThemeProvider } from '@mui/material/styles'
import React from 'react'
import type { PersonType } from '../types/majorTypes'
import type { PersonCredentials } from '../tools/personLookup'
import { caseFolderTheme } from '../theme/caseFolderTheme'
import { PersonFinder } from './PersonFinder'
import { PersonIndexCard } from './PersonIndexCard'
import { PersonCardDialog } from './PersonCardDialog'
import { PersonForm } from './AddPerson/PersonForm'
import './PersonIndexCard.css'

export function EntryPeopleDialog({
    people,
    casePeople,
    onAdd,
    onRemove,
    onUpdate,
    onClose,
}: {
    people: PersonType[]
    casePeople: PersonType[]
    onAdd: (person: PersonType) => void
    onRemove: (id: string) => void
    onUpdate: (person: PersonType) => void
    onClose: () => void
}) {
    const [savingPerson, setSavingPerson] = React.useState(false)
    const [creation, setCreation] = React.useState<PersonCredentials | null>(null)
    const [opened, setOpened] = React.useState<PersonType | null>(null)
    const [clearSearch, setClearSearch] = React.useState(0)
    const available = casePeople.filter((person) => !people.some((selected) => selected.id === person.id))
    return (
        <ThemeProvider theme={caseFolderTheme}>
            <Dialog
                open
                fullScreen
                onClose={onClose}
                aria-labelledby="entry-people-title"
                slotProps={{ paper: { sx: { bgcolor: 'transparent', backgroundImage: 'none' } } }}
            >
                <Box
                    sx={{
                        p: { xs: 1.5, sm: 4 },
                        overflowY: 'auto',
                        minHeight: '100%',
                        bgcolor: 'var(--mui-palette-background-default, #edf3f1)',
                        backgroundImage:
                            'radial-gradient(var(--mui-palette-divider, #d7e1df) 0.7px, transparent 0.7px)',
                        backgroundSize: '12px 12px',
                    }}
                >
                    <Box className="people-folder">
                        <DialogTitle
                            id="entry-people-title"
                            sx={{ p: 0, mb: 3, fontFamily: 'Georgia, serif', fontSize: { xs: '1.8rem', sm: '2.2rem' } }}
                        >
                            Add people to entry
                        </DialogTitle>
                        <Stack spacing={3.5}>
                            <Box>
                                <Typography
                                    component="h2"
                                    className="people-section-label"
                                >
                                    On this entry · {people.length}
                                </Typography>
                                {people.length ? (
                                    <Box className="people-card-grid">
                                        {people.map((person) => (
                                            <PersonIndexCard
                                                key={person.id}
                                                person={person}
                                                onOpen={() => setOpened(person)}
                                                onRemove={() => onRemove(person.id)}
                                            />
                                        ))}
                                    </Box>
                                ) : (
                                    <Typography
                                        variant="body2"
                                        color="text.secondary"
                                    >
                                        Add someone from this case, or find a person below.
                                    </Typography>
                                )}
                            </Box>
                            <Box>
                                <Typography
                                    component="h2"
                                    className="people-section-label"
                                >
                                    People on this case
                                </Typography>
                                {available.length ? (
                                    <Box className="people-card-grid">
                                        {available.map((person) => (
                                            <PersonIndexCard
                                                key={person.id}
                                                person={person}
                                                onOpen={() => setOpened(person)}
                                                onAdd={() => onAdd(person)}
                                            />
                                        ))}
                                    </Box>
                                ) : (
                                    <Typography
                                        variant="body2"
                                        color="text.secondary"
                                    >
                                        {casePeople.length
                                            ? 'Everyone on this case has been added.'
                                            : 'No people on this case yet.'}
                                    </Typography>
                                )}
                            </Box>
                            <Box className="people-search-card">
                                <PersonFinder
                                    embedded
                                    onSelect={onAdd}
                                    onCreateRequest={setCreation}
                                    onUpdate={onUpdate}
                                    clearTrigger={clearSearch}
                                />
                            </Box>
                            <Box sx={{ textAlign: 'right' }}>
                                <Button
                                    variant="contained"
                                    onClick={onClose}
                                >
                                    Done
                                </Button>
                            </Box>
                        </Stack>
                    </Box>
                </Box>
            </Dialog>
            {creation && (
                <Dialog
                    open
                    onClose={savingPerson ? undefined : () => setCreation(null)}
                    fullWidth
                    maxWidth="sm"
                    aria-label="Create person"
                    slotProps={{ paper: { sx: { bgcolor: '#e9d1a0' } } }}
                >
                    <DialogContent sx={{ p: { xs: 1.5, sm: 3 } }}>
                        <PersonForm
                            credentials={creation}
                            onBusyChange={setSavingPerson}
                            onCancel={() => setCreation(null)}
                            onSaved={(person) => {
                                onAdd(person)
                                setCreation(null)
                                setClearSearch((value) => value + 1)
                            }}
                        />
                    </DialogContent>
                </Dialog>
            )}
            {opened && (
                <PersonCardDialog
                    person={opened}
                    onClose={() => setOpened(null)}
                    onSaved={(person) => {
                        onUpdate(person)
                        setOpened(person)
                    }}
                />
            )}
        </ThemeProvider>
    )
}
