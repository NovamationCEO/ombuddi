import { useQueryClient } from '@tanstack/react-query'
import { CaseThemeSelector } from '../CaseThemeSelector'
import { pageLayoutStyle, pageContentStyle } from '../../theme/pageLayout'
import { Button, Chip, Collapse, TextField, Tooltip, Typography } from '@mui/material'
import { ThemeProvider } from '@mui/material/styles'
import { Box, Stack } from '@mui/system'
import React from 'react'
import { useNavigate } from 'react-router-dom'
import { LockOutlined, Shuffle } from '@mui/icons-material'
import { useSnack } from '../../libraries/useSnack'
import { creator } from '../../tools/db_tools/creator'
import { CaseCodeFlags } from './CaseCodeFlags'
import { caseFolderTheme } from '../../theme/caseFolderTheme'
import { usePicklists } from '../../tools/usePicklists'
import '../../theme/caseFolder.css'
import { useOrganization } from '../../tools/useOrganization'
import { ReferralSourceSelector } from '../ReferralSourceSelector'
import { ReferralSourceSelectionType } from '../../types/majorTypes'
import { referralSelectionsAreValid } from '../../tools/referralSources'
import { usePhraseSelection } from '../../tools/phraseSource'
import { PhraseSourceControl } from '../PhraseSourceControl'
import { encryptProtectedText } from '../../tools/notesCrypto'
import { CaseSceneThumbnail } from '../CaseSceneThumbnail'

export function AddNewCase() {
    const queryClient = useQueryClient()
    const [themes, setThemes] = React.useState<string[]>([])
    const [caseName, setCaseName] = React.useState('')
    const [activeIoaCodes, setActiveIoaCodes] = React.useState<string[]>([])
    const [activeOrgCodes, setActiveOrgCodes] = React.useState<string[]>([])
    const [referralSources, setReferralSources] = React.useState<ReferralSourceSelectionType[]>([])
    const [showReferralErrors, setShowReferralErrors] = React.useState(false)
    const [referralsOpen, setReferralsOpen] = React.useState(false)
    const [protectionOpen, setProtectionOpen] = React.useState(false)
    const referralOptions = usePicklists('referral_source')
    const setSnack = useSnack((state) => state.setSnack)
    const navigate = useNavigate()
    const [description, setDescription] = React.useState('')
    const [isSaving, setIsSaving] = React.useState(false)
    const descriptionPhrase = usePhraseSelection('default', true)
    const organizationId = useOrganization().id
    // crypto.randomUUID is available in all modern browsers (requires HTTPS or localhost).
    // useMemo so the id is stable across re-renders while the user is filling out the form.
    const newId = React.useMemo(() => crypto.randomUUID(), [])

    async function getRandomName() {
        const newRandomName = await fetch('https://random-word-api.herokuapp.com/word?number=3')
            .then((response) => response.json())
            .then((data) => {
                const randomName = data.join(' ')
                return randomName
            })
            .catch((error) => {
                console.error('Error fetching random name:', error)
                return 'Random Name'
            })
        setCaseName(newRandomName)
    }

    async function save() {
        if (isSaving) return
        if (!caseName.trim()) {
            setSnack({ message: 'Enter a case name before saving.', severity: 'error' })
            return
        }
        if (!referralSelectionsAreValid(referralSources)) {
            setShowReferralErrors(true)
            setReferralsOpen(true)
            setSnack({ message: 'Specify the Other referral source before saving.', severity: 'error' })
            return
        }
        if (description && descriptionPhrase.phrase === null) {
            setProtectionOpen(true)
            setSnack({
                message:
                    'Choose Blank, set the Default Encryption Phrase, or provide free text for the case description.',
                severity: 'error',
            })
            return
        }

        const storedDescription = description
            ? await encryptProtectedText(description, descriptionPhrase.phrase ?? '', organizationId)
            : ''

        const payload = {
            id: newId,
            name: caseName,
            description: storedDescription,
            codes: [...new Set([...activeIoaCodes, ...activeOrgCodes])],
            status: 'active',
            themes,
            referralSources: referralSources.map((selection) => ({
                id: selection.id,
                ...(selection.detail !== undefined ? { detail: selection.detail.trim() } : {}),
            })),
        }

        setIsSaving(true)
        try {
            const response = await creator<{ id: string; status: string; success: boolean }>('create_case', payload)
            if (response.success) {
                await queryClient.invalidateQueries({ queryKey: ['get_picklists_by_organization_id'] })
                setSnack({
                    message: 'Case created successfully',
                    severity: 'success',
                })
                navigate(`/case/${response.id || newId}`)
                return
            }

            setSnack({
                message: `Unable to create case: ${response.status || 'Unknown error'}`,
                severity: 'error',
            })
        } catch (error) {
            setSnack({
                message: `Unable to create case: ${error instanceof Error ? error.message : 'Unknown error'}`,
                severity: 'error',
            })
        } finally {
            setIsSaving(false)
        }
    }

    function cancel() {
        navigate('/cases')
    }

    const needsPhrase = !!description && descriptionPhrase.phrase === null
    const protectionExpanded = protectionOpen || needsPhrase
    const phraseLabel = { blank: 'Blank', default: 'Default Encryption Phrase', custom: 'Free text' }[
        descriptionPhrase.source
    ]
    const phraseStatus =
        descriptionPhrase.source === 'blank'
            ? 'No phrase-based protection beyond organization separation.'
            : descriptionPhrase.phrase === null
              ? descriptionPhrase.source === 'default' && descriptionPhrase.defaultPhrase
                  ? 'Confirm the Default Encryption Phrase before saving a description.'
                  : 'Choose a phrase before saving a description.'
              : descriptionPhrase.source === 'default'
                ? 'Using Default Encryption Phrase'
                : 'Using a phrase for this description only.'

    return (
        <Box sx={pageLayoutStyle}>
            <ThemeProvider theme={caseFolderTheme}>
                <Box sx={pageContentStyle}>
                    <Box className="case-folder">
                        <Box
                            className="case-folder-tab"
                            aria-hidden="true"
                        >
                            New case
                        </Box>
                        <Box className="case-folder-body">
                            <Box
                                component="section"
                                className="case-folder-paper"
                                aria-labelledby="new-case-title"
                            >
                                <Typography
                                    component="h1"
                                    id="new-case-title"
                                    sx={{
                                        fontFamily: "Georgia, 'Times New Roman', serif",
                                        fontSize: '1.4rem',
                                        mb: 4,
                                    }}
                                >
                                    <Box
                                        component="span"
                                        sx={{ color: 'text.secondary', fontWeight: 400 }}
                                    >
                                        Cases /{' '}
                                    </Box>
                                    Add New Case
                                </Typography>
                                <Box sx={{ display: 'flex', gap: 2, alignItems: 'flex-start', mb: 4 }}>
                                    <Box sx={{ flex: 1, minWidth: 0 }}>
                                        <TextField
                                            id="case-name"
                                            value={caseName}
                                            onChange={(e) => setCaseName(e.target.value)}
                                            label="Case Name"
                                            required
                                            fullWidth
                                            variant="standard"
                                            placeholder="Give this case a name"
                                            disabled={isSaving}
                                            slotProps={{ inputLabel: { shrink: true } }}
                                            helperText="Visible within your organization. Avoid sensitive details."
                                            sx={{
                                                '& .MuiInputBase-input': {
                                                    fontFamily: "Georgia, 'Times New Roman', serif",
                                                    fontSize: { xs: '1.45rem', sm: '1.9rem' },
                                                    py: 1.5,
                                                },
                                                '& .MuiInputLabel-root': { color: 'text.primary' },
                                                '& .MuiFormHelperText-root': { mt: 1 },
                                            }}
                                        />
                                        <Button
                                            startIcon={<Shuffle />}
                                            onClick={getRandomName}
                                            disabled={isSaving}
                                            sx={{ mt: 0.75 }}
                                        >
                                            Randomize
                                        </Button>
                                    </Box>
                                    <Tooltip title="A stable abstract scene that helps visually distinguish this case without describing it.">
                                        <Box
                                            sx={{
                                                width: { xs: 48, sm: 72 },
                                                height: { xs: 48, sm: 72 },
                                                flexShrink: 0,
                                                mt: 2,
                                            }}
                                        >
                                            <CaseSceneThumbnail seed={newId} />
                                        </Box>
                                    </Tooltip>
                                </Box>
                                <TextField
                                    id="case-description"
                                    value={description}
                                    onChange={(e) => {
                                        setDescription(e.target.value)
                                        if (e.target.value && descriptionPhrase.phrase === null) setProtectionOpen(true)
                                    }}
                                    label="Description"
                                    placeholder="Write a brief description…"
                                    fullWidth
                                    multiline
                                    minRows={5}
                                    variant="standard"
                                    disabled={isSaving}
                                    slotProps={{ inputLabel: { shrink: true } }}
                                    sx={{
                                        '& .MuiInputLabel-root': { color: 'text.primary' },
                                        '& .MuiInputBase-root': { mt: 3, px: 1, pb: 2 },
                                        '& .MuiInputBase-input': { lineHeight: 1.8 },
                                        '& .MuiInput-underline:before': { borderColor: 'divider' },
                                    }}
                                />
                                <Box sx={{ py: 2.5, borderBottom: '1px solid', borderColor: 'divider' }}>
                                    <Stack
                                        direction="row"
                                        spacing={1.5}
                                        sx={{ alignItems: 'flex-start' }}
                                    >
                                        <LockOutlined
                                            sx={{
                                                color:
                                                    descriptionPhrase.source === 'blank' || needsPhrase
                                                        ? 'warning.main'
                                                        : 'secondary.main',
                                                mt: 0.25,
                                            }}
                                        />
                                        <Box sx={{ flex: 1, minWidth: 0 }}>
                                            <Typography variant="body2">
                                                Description protection: <b>{phraseLabel}</b>
                                            </Typography>
                                            <Typography
                                                variant="caption"
                                                color={
                                                    descriptionPhrase.source === 'blank' || needsPhrase
                                                        ? 'warning.main'
                                                        : 'text.secondary'
                                                }
                                            >
                                                {phraseStatus}
                                            </Typography>
                                        </Box>
                                        <Button
                                            size="small"
                                            disabled={isSaving}
                                            aria-expanded={protectionExpanded}
                                            aria-controls="case-protection-controls"
                                            onClick={() => setProtectionOpen(!protectionExpanded)}
                                            sx={{ minWidth: 0, textDecoration: 'underline' }}
                                        >
                                            {protectionExpanded ? (needsPhrase ? 'Set phrase' : 'Done') : 'Change'}
                                        </Button>
                                    </Stack>
                                    <Collapse in={protectionExpanded}>
                                        <Box
                                            id="case-protection-controls"
                                            sx={{ pt: 2 }}
                                        >
                                            <PhraseSourceControl
                                                source={descriptionPhrase.source}
                                                onSourceChange={descriptionPhrase.setSource}
                                                customPhrase={descriptionPhrase.customPhrase}
                                                onCustomPhraseChange={descriptionPhrase.setCustomPhrase}
                                                defaultConfirmed={descriptionPhrase.defaultConfirmed}
                                                onConfirmDefault={descriptionPhrase.confirmDefault}
                                                purpose="encrypt"
                                                compact
                                            />
                                        </Box>
                                    </Collapse>
                                </Box>
                                <Box sx={{ mt: 3 }}>
                                    <CaseThemeSelector
                                        value={themes}
                                        onChange={setThemes}
                                        disabled={isSaving}
                                    />
                                </Box>
                                <Box sx={{ pt: 3 }}>
                                    <Stack
                                        direction="row"
                                        sx={{ alignItems: 'center', justifyContent: 'space-between', gap: 1 }}
                                    >
                                        <Typography
                                            component="h2"
                                            variant="subtitle1"
                                        >
                                            Referral Sources
                                        </Typography>
                                        <Button
                                            size="small"
                                            disabled={isSaving}
                                            aria-expanded={referralsOpen}
                                            aria-controls="case-referral-controls"
                                            onClick={() => setReferralsOpen(!referralsOpen)}
                                            sx={{ textDecoration: 'underline', flexShrink: 0 }}
                                        >
                                            {referralsOpen ? 'Done' : 'Edit sources'}
                                        </Button>
                                    </Stack>
                                    {!referralsOpen && (
                                        <Box sx={{ mt: 1 }}>
                                            {referralSources.length === 0 ? (
                                                <Typography
                                                    variant="body2"
                                                    color="text.secondary"
                                                >
                                                    No sources selected
                                                </Typography>
                                            ) : (
                                                <Stack
                                                    direction="row"
                                                    useFlexGap
                                                    spacing={1}
                                                    sx={{ flexWrap: 'wrap' }}
                                                >
                                                    {referralSources.map((selection) => (
                                                        <Chip
                                                            key={selection.id}
                                                            size="small"
                                                            label={
                                                                referralOptions.items.find(
                                                                    (option) => option.id === selection.id,
                                                                )?.name ?? 'Selected source'
                                                            }
                                                            sx={{
                                                                maxWidth: '100%',
                                                                height: 'auto',
                                                                '& .MuiChip-label': { whiteSpace: 'normal', py: 0.5 },
                                                            }}
                                                        />
                                                    ))}
                                                </Stack>
                                            )}
                                        </Box>
                                    )}
                                    <Collapse in={referralsOpen}>
                                        <Box
                                            id="case-referral-controls"
                                            sx={{ pt: 1 }}
                                        >
                                            <ReferralSourceSelector
                                                value={referralSources}
                                                onChange={(value) => {
                                                    setReferralSources(value)
                                                    setShowReferralErrors(false)
                                                }}
                                                showErrors={showReferralErrors}
                                                disabled={isSaving}
                                            />
                                        </Box>
                                    </Collapse>
                                </Box>
                            </Box>
                            <Box
                                component="aside"
                                className="case-folder-flags"
                                aria-label="Case codes"
                            >
                                <CaseCodeFlags
                                    caseId={newId}
                                    source={{ kind: 'ioa' }}
                                    activeCodes={activeIoaCodes}
                                    setActiveCodes={setActiveIoaCodes}
                                    disabled={isSaving}
                                />
                                <Box sx={{ my: 3, borderTop: '1px solid #CCBC9B' }} />
                                <CaseCodeFlags
                                    caseId={newId}
                                    source={{ kind: 'org', organizationId }}
                                    activeCodes={activeOrgCodes}
                                    setActiveCodes={setActiveOrgCodes}
                                    disabled={isSaving}
                                />
                            </Box>
                        </Box>
                        <Stack
                            direction="row"
                            sx={{ justifyContent: 'space-between', alignItems: 'center', pt: 3, px: { xs: 1, sm: 2 } }}
                        >
                            <Button
                                onClick={cancel}
                                disabled={isSaving}
                                sx={{ color: 'text.primary' }}
                            >
                                Cancel
                            </Button>
                            <Button
                                variant="contained"
                                disableElevation
                                onClick={save}
                                disabled={isSaving}
                                sx={{ px: 4, py: 1.25 }}
                            >
                                {isSaving ? 'Creating…' : 'Create case'}
                            </Button>
                        </Stack>
                    </Box>
                </Box>
            </ThemeProvider>
        </Box>
    )
}
