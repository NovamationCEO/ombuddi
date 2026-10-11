import { Box, Button, Dialog, DialogTitle, Stack, Typography } from '@mui/material'
import { ThemeProvider } from '@mui/material/styles'
import { ContactPageOutlined } from '@mui/icons-material'
import React from 'react'
import type { EntryRole } from '../tools/entryRoles'
import type { EntryPersonType, PersonType } from '../types/majorTypes'
import type { PersonCredentials } from '../tools/personLookup'
import { caseFolderTheme } from '../theme/caseFolderTheme'
import { PersonFinder } from './PersonFinder'
import { PersonIndexCard } from './PersonIndexCard'
import { PersonCardDialog } from './PersonCardDialog'
import { PersonForm } from './AddPerson/PersonForm'
import './PersonIndexCard.css'

type Editor = { key: number } & (
    | { kind: 'new'; credentials: PersonCredentials }
    | { kind: 'person'; person: PersonType; name: string }
)

export function EntryPeopleDialog({
    people,
    casePeople,
    onAdd,
    onRemove,
    onRoleChange,
    onUpdate,
    onClose,
}: {
    people: EntryPersonType[]
    casePeople: PersonType[]
    onAdd: (person: PersonType) => void
    onRemove: (id: string) => void
    onRoleChange: (id: string, role: EntryRole) => void
    onUpdate: (person: PersonType) => void
    onClose: () => void
}) {
    const [savingPerson, setSavingPerson] = React.useState(false)
    const [editor, setEditor] = React.useState<Editor | null>(null)
    const [clearSearch, setClearSearch] = React.useState(0)
    const sequence = React.useRef(0)
    const editorPanel = React.useRef<HTMLElement>(null)
    const available = casePeople.filter((person) => !people.some((selected) => selected.id === person.id))
    function openPerson(person: PersonType, name = '') {
        setEditor({ kind: 'person', person, name, key: ++sequence.current })
    }
    React.useEffect(() => {
        if (editor) {
            editorPanel.current?.scrollIntoView?.({ block: 'start', behavior: 'instant' })
            editorPanel.current?.focus({ preventScroll: true })
        }
    }, [editor?.key])
    return (
        <ThemeProvider theme={caseFolderTheme}>
            <Dialog
                open
                fullScreen
                onClose={savingPerson ? undefined : onClose}
                aria-labelledby="entry-people-title"
                slotProps={{ paper: { sx: { bgcolor: 'transparent', backgroundImage: 'none' } } }}
            >
                <Box className="people-desk">
                    <Box className="people-workspace">
                        <Box
                            className="people-folder people-selection-folder"
                            inert={savingPerson}
                        >
                            <Box className="people-folder-liner">
                                <DialogTitle
                                    id="entry-people-title"
                                    sx={{
                                        p: 0,
                                        mb: 3,
                                        fontFamily: 'Georgia, serif',
                                        fontSize: { xs: '1.8rem', sm: '2.2rem' },
                                    }}
                                >
                                    Add people to entry
                                </DialogTitle>
                                <Stack spacing={3}>
                                    <Box className="people-selected-tray">
                                        <span
                                            className="stationery-paperclip"
                                            aria-hidden="true"
                                        />
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
                                                        selected={
                                                            editor?.kind === 'person' && editor.person.id === person.id
                                                        }
                                                        onOpen={() => openPerson(person)}
                                                        onRemove={() => onRemove(person.id)}
                                                        entryRole={person.entryRole ?? 'visitor'}
                                                        onRoleChange={(role) => onRoleChange(person.id, role)}
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
                                                        selected={
                                                            editor?.kind === 'person' && editor.person.id === person.id
                                                        }
                                                        onOpen={() => openPerson(person)}
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
                                            onCreateRequest={(credentials) =>
                                                setEditor({ kind: 'new', credentials, key: ++sequence.current })
                                            }
                                            onOpenPerson={openPerson}
                                            onUpdate={onUpdate}
                                            clearTrigger={clearSearch}
                                        />
                                    </Box>
                                    <Box sx={{ textAlign: 'right' }}>
                                        <Button
                                            variant="contained"
                                            disabled={savingPerson}
                                            onClick={onClose}
                                        >
                                            Done
                                        </Button>
                                    </Box>
                                </Stack>
                            </Box>
                        </Box>
                        <Box
                            component="aside"
                            ref={editorPanel}
                            tabIndex={-1}
                            className="people-editor-sheet"
                            aria-labelledby="people-editor-title"
                        >
                            <Typography
                                id="people-editor-title"
                                component="h2"
                                className="people-editor-title"
                            >
                                {editor?.kind === 'new'
                                    ? 'Add a person'
                                    : editor?.kind === 'person'
                                      ? 'Person details'
                                      : 'Add / edit a person'}
                            </Typography>
                            <Box className="people-editor-stack">
                                <span
                                    className="stationery-paperclip stationery-paperclip-right"
                                    aria-hidden="true"
                                />
                                {editor?.kind === 'new' ? (
                                    <PersonForm
                                        key={editor.key}
                                        credentials={editor.credentials}
                                        onBusyChange={setSavingPerson}
                                        onCancel={() => setEditor(null)}
                                        onSaved={(person) => {
                                            onAdd(person)
                                            setEditor(null)
                                            setClearSearch((value) => value + 1)
                                        }}
                                    />
                                ) : editor?.kind === 'person' ? (
                                    <PersonCardDialog
                                        key={editor.key}
                                        embedded
                                        person={editor.person}
                                        initialName={editor.name}
                                        onBusyChange={setSavingPerson}
                                        onClose={() => setEditor(null)}
                                        onSaved={(person) => {
                                            onUpdate(person)
                                            setClearSearch((value) => value + 1)
                                        }}
                                    />
                                ) : (
                                    <Box className="person-index-card person-card-form people-empty-card">
                                        <ContactPageOutlined sx={{ fontSize: 44, color: '#768888', mb: 2 }} />
                                        <Typography
                                            component="h3"
                                            sx={{ fontFamily: 'Georgia, serif', fontSize: '1.7rem', mb: 2 }}
                                        >
                                            A place for every person.
                                        </Typography>
                                        <Typography
                                            color="text.secondary"
                                            sx={{ mb: 3 }}
                                        >
                                            Choose an index card to view or edit a person’s details.
                                        </Typography>
                                        <Typography color="text.secondary">
                                            Adding someone new? Start with a search, then fill out their card here.
                                        </Typography>
                                        <Box
                                            className="people-blank-rules"
                                            aria-hidden="true"
                                        />
                                    </Box>
                                )}
                            </Box>
                        </Box>
                    </Box>
                </Box>
            </Dialog>
        </ThemeProvider>
    )
}
