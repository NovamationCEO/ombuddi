import {
    Alert,
    Autocomplete,
    Box,
    Button,
    Checkbox,
    Collapse,
    FormControlLabel,
    Stack,
    TextField,
    Typography,
} from '@mui/material'
import { LockOutlined, ExpandMore, VpnKeyOutlined } from '@mui/icons-material'
import React from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { usePicklists } from '../../tools/usePicklists'
import { useGetter } from '../../tools/db_tools/useGetter'
import { useOrganization } from '../../tools/useOrganization'
import { creator } from '../../tools/db_tools/creator'
import { updater } from '../../tools/db_tools/updater'
import { findPeople, type PersonCredentials } from '../../tools/personLookup'
import { hashPersonName } from '../../tools/useHashName'
import type { PersonType, PrimaryRoleType } from '../../types/majorTypes'
import { getPrimaryRoleOptions } from './primaryRoleOptions'
import { PersonAvatar } from '../PersonAvatar'
import { PersonPhraseField } from '../PersonPhraseField'
import '../PersonIndexCard.css'

function DetailPicker({
    kind,
    label,
    value,
    onChange,
}: {
    kind: string
    label: string
    value: string
    onChange: (value: string) => void
}) {
    const { items } = usePicklists(kind)
    return (
        <Autocomplete
            freeSolo
            options={items.map((item) => item.name)}
            value={value}
            onInputChange={(_, text) => onChange(text)}
            renderInput={(params) => (
                <TextField
                    {...params}
                    label={label}
                    variant="standard"
                />
            )}
        />
    )
}

/** Creation always rechecks the exact current inputs. Editing carries verified credentials,
 * which the server verifies again in the same transaction as the write. */
export function PersonForm({
    credentials,
    person,
    onSaved,
    onCancel,
    onBusyChange,
}: {
    credentials: PersonCredentials
    person?: PersonType
    onSaved: (person: PersonType, credentials: PersonCredentials) => void
    onCancel?: () => void
    onBusyChange?: (busy: boolean) => void
}) {
    const [name, setName] = React.useState(credentials.name)
    const [phrase, setPhrase] = React.useState(credentials.phrase)
    const [replacement, setReplacement] = React.useState<string | null>(null)
    const [isPublic, setIsPublic] = React.useState(person?.isPublic ?? false)
    const [gender, setGender] = React.useState(person?.gender ?? 'unknown')
    const [generation, setGeneration] = React.useState(person?.generation ?? 'unknown')
    const [race, setRace] = React.useState(person?.race ?? 'unknown')
    const [primaryRole, setPrimaryRole] = React.useState(person?.primaryRole ?? 'unknown')
    const [isInternational, setIsInternational] = React.useState(person?.isInternational ?? false)
    const [category1, setCategory1] = React.useState(person?.category1 ?? '')
    const [category2, setCategory2] = React.useState(person?.category2 ?? '')
    const [category3, setCategory3] = React.useState(person?.category3 ?? '')
    const [more, setMore] = React.useState(false)
    const [busy, setBusy] = React.useState(false)
    const [error, setError] = React.useState('')
    const organization = useOrganization()
    const orgId = person?.organizationId || organization.id
    const roles = useGetter<PrimaryRoleType[]>(['get_primary_roles_by_organization_id', orgId])
    const roleOptions = getPrimaryRoleOptions(
        [...(roles.data ?? [])].sort((a, b) => a.index - b.index),
        roles.isLoading,
    )
    const queryClient = useQueryClient()

    async function save(event: React.FormEvent) {
        event.preventDefault()
        if (busy || !orgId || !name.trim()) return
        const nextPhrase = replacement ?? phrase
        if (!isPublic && ((!person && !nextPhrase) || replacement === '')) {
            setError('Choose a phrase to protect this person.')
            return
        }
        setBusy(true)
        onBusyChange?.(true)
        setError('')
        try {
            // Do not turn network errors into a no-match result or reuse a search for changed inputs.
            if (!person || replacement !== null) {
                const matches = await findPeople({ name: name.trim(), phrase: nextPhrase }, orgId)
                if (matches.some((match) => match.id !== person?.id)) {
                    setError('A matching person already exists. Return to the search and select their card.')
                    return
                }
            }
            const details = { gender, generation, race, primaryRole, isInternational, category1, category2, category3 }
            const nextCredentials = { name: name.trim(), phrase: nextPhrase }
            let saved: PersonType
            if (person) {
                await updater('update_person', {
                    id: person.id,
                    ...details,
                    ...(isPublic
                        ? { publicName: name.trim() }
                        : {
                              currentHashedName: hashPersonName(credentials.name, credentials.phrase, orgId),
                              ...(replacement !== null
                                  ? { newHashedName: hashPersonName(name, replacement, orgId) }
                                  : {}),
                          }),
                })
                saved = { ...person, ...details, ...(isPublic ? { publicName: name.trim() } : {}) }
            } else {
                const identity = isPublic
                    ? { publicName: name.trim(), isPublic: true }
                    : { hashedName: hashPersonName(name, phrase, orgId), isPublic: false }
                const result = await creator<{ id: string; monsterSeed: string; monsterVersion: number }>(
                    'add_person',
                    { ...details, ...identity, organizationId: orgId },
                )
                if (!result.id) throw new Error('The person could not be saved.')
                saved = { ...details, ...identity, ...result, organizationId: orgId }
            }
            await Promise.all(
                [
                    'get_persons_by_hashed_name',
                    'get_person_by_id',
                    'get_persons_by_case_id',
                    'get_persons_by_entry_id',
                    'get_public_persons_by_organization_id',
                    'search_public_persons',
                ].map((key) => queryClient.invalidateQueries({ queryKey: [key] })),
            )
            onSaved(saved, nextCredentials)
        } catch (caught) {
            setError(caught instanceof Error ? caught.message : 'Unable to save this person.')
        } finally {
            setBusy(false)
            onBusyChange?.(false)
        }
    }
    return (
        <Box
            component="form"
            onSubmit={save}
            className="person-index-card person-card-form"
        >
            <Stack
                direction="row"
                sx={{ justifyContent: 'space-between', alignItems: 'center', mb: 3 }}
            >
                <Box>
                    <Typography
                        component="h2"
                        sx={{ fontFamily: 'Georgia, serif', fontSize: '1.7rem' }}
                    >
                        {person ? 'Edit person' : 'New person'}
                    </Typography>
                    <Typography
                        variant="body2"
                        color="text.secondary"
                    >
                        {isPublic
                            ? 'Public person · name visible to the organization'
                            : person
                              ? 'Update this person’s card.'
                              : 'Add a card for someone new.'}
                    </Typography>
                </Box>
                {person ? (
                    <PersonAvatar
                        person={person}
                        size={58}
                    />
                ) : (
                    <LockOutlined sx={{ color: 'text.secondary', fontSize: 30 }} />
                )}
            </Stack>
            <Box
                component="fieldset"
                disabled={busy}
                sx={{ border: 0, p: 0, m: 0, minWidth: 0 }}
            >
                <Stack spacing={3}>
                    <TextField
                        label="Full Name"
                        variant="standard"
                        value={name}
                        onChange={(event) => setName(event.target.value)}
                        fullWidth
                        autoComplete="off"
                        slotProps={{
                            input: { readOnly: Boolean(person && !isPublic) },
                            htmlInput: { 'data-1p-ignore': '', 'data-op-ignore': '' },
                        }}
                    />
                    {!isPublic &&
                        (!person ? (
                            <PersonPhraseField
                                value={phrase}
                                onChange={setPhrase}
                                disabled={busy}
                            />
                        ) : (
                            <Box>
                                <Typography
                                    variant="body2"
                                    color="text.secondary"
                                >
                                    Full name and phrase verified.
                                </Typography>
                                <Button
                                    type="button"
                                    startIcon={<VpnKeyOutlined />}
                                    onClick={() => setReplacement(replacement === null ? '' : null)}
                                >
                                    {replacement === null ? 'Change phrase' : 'Keep current phrase'}
                                </Button>
                                {replacement !== null && (
                                    <Stack
                                        spacing={1}
                                        sx={{ mt: 1 }}
                                    >
                                        <PersonPhraseField
                                            label="New phrase"
                                            value={replacement}
                                            onChange={setReplacement}
                                            disabled={busy}
                                        />
                                        <Typography
                                            variant="body2"
                                            color="text.secondary"
                                        >
                                            Use the new phrase to find this person next time. It cannot be recovered.
                                        </Typography>
                                    </Stack>
                                )}
                            </Box>
                        ))}
                    <Box className="person-card-fields">
                        <Autocomplete
                            options={roleOptions.map((role) => role.value)}
                            value={primaryRole}
                            loading={roles.isLoading}
                            freeSolo
                            onInputChange={(_, text) => setPrimaryRole(text)}
                            renderInput={(params) => (
                                <TextField
                                    {...params}
                                    label="Primary role"
                                    variant="standard"
                                />
                            )}
                        />
                        <DetailPicker
                            kind="gender"
                            label="Gender"
                            value={gender}
                            onChange={setGender}
                        />
                        <DetailPicker
                            kind="generation"
                            label="Generation"
                            value={generation}
                            onChange={setGeneration}
                        />
                        <DetailPicker
                            kind="race"
                            label="Race"
                            value={race}
                            onChange={setRace}
                        />
                    </Box>
                    <Box>
                        <Button
                            type="button"
                            endIcon={<ExpandMore />}
                            onClick={() => setMore(!more)}
                            aria-expanded={more}
                        >
                            More details
                        </Button>
                        <Collapse in={more}>
                            <Stack
                                spacing={2}
                                sx={{ pt: 1 }}
                            >
                                {!person && (
                                    <FormControlLabel
                                        control={
                                            <Checkbox
                                                checked={isPublic}
                                                onChange={(event) => setIsPublic(event.target.checked)}
                                            />
                                        }
                                        label="Public person (name visible to the organization)"
                                    />
                                )}
                                <FormControlLabel
                                    control={
                                        <Checkbox
                                            checked={isInternational}
                                            onChange={(event) => setIsInternational(event.target.checked)}
                                        />
                                    }
                                    label="International"
                                />
                                {[
                                    { value: category1, setValue: setCategory1 },
                                    { value: category2, setValue: setCategory2 },
                                    { value: category3, setValue: setCategory3 },
                                ].map(({ value, setValue }, i) => (
                                    <TextField
                                        key={i}
                                        variant="standard"
                                        label={`Category ${i + 1}`}
                                        value={value}
                                        onChange={(event) => setValue(event.target.value)}
                                    />
                                ))}
                            </Stack>
                        </Collapse>
                    </Box>
                    {error && <Alert severity="error">{error}</Alert>}
                    <Stack
                        direction="row"
                        spacing={1}
                        sx={{ justifyContent: 'flex-end' }}
                    >
                        <Button
                            type="button"
                            onClick={onCancel}
                            disabled={busy}
                        >
                            Cancel
                        </Button>
                        <Button
                            type="submit"
                            variant="contained"
                            disabled={busy || !name.trim()}
                        >
                            {busy ? 'Saving…' : 'Save person'}
                        </Button>
                    </Stack>
                </Stack>
            </Box>
        </Box>
    )
}
