import React from 'react'
import { Add } from '@mui/icons-material'
import { ThemePaperLabel } from './ThemePaperLabel'
import { Box, Button, Dialog, DialogActions, DialogContent, DialogTitle, Stack, Typography } from '@mui/material'
import { useQueryClient } from '@tanstack/react-query'
import { CaseThemeSelector } from './CaseThemeSelector'
import { updater } from '../tools/db_tools/updater'
import { useSnack } from '../libraries/useSnack'

export function CaseThemes({ caseId, value, onSaved }: { caseId: string; value: string[]; onSaved: () => void }) {
    const [open, setOpen] = React.useState(false)
    const [draft, setDraft] = React.useState<string[]>([])
    const [saving, setSaving] = React.useState(false)
    const queryClient = useQueryClient()
    const setSnack = useSnack((state) => state.setSnack)
    async function save() {
        if (saving) return
        setSaving(true)
        try {
            await updater('update_case_themes', { caseId, themes: draft })
            await Promise.all([
                queryClient.invalidateQueries({ queryKey: ['get_picklists_by_organization_id'] }),
                queryClient.invalidateQueries({ queryKey: ['reports'] }),
                queryClient.invalidateQueries({ queryKey: ['get_all_cases'] }),
                queryClient.invalidateQueries({ queryKey: ['get_cases_by_status'] }),
            ])
            onSaved()
            setOpen(false)
            setSnack({ message: 'Case themes saved.', severity: 'success' })
        } catch (error) {
            setSnack({
                message: error instanceof Error ? error.message : 'Unable to save case themes.',
                severity: 'error',
            })
        } finally {
            setSaving(false)
        }
    }
    return (
        <Box
            component="section"
            aria-labelledby="case-themes-title"
            sx={{ mt: 2 }}
        >
            <Stack
                direction="row"
                sx={{ alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 1 }}
            >
                <Typography
                    component="h2"
                    id="case-themes-title"
                    className="case-review-label"
                >
                    Themes
                </Typography>
                <Button
                    size="small"
                    startIcon={<Add sx={{ fontSize: 16 }} />}
                    sx={{ fontSize: '0.75rem', textTransform: 'none' }}
                    aria-label="Edit case themes"
                    onClick={() => {
                        setDraft([...value])
                        setOpen(true)
                    }}
                >
                    Add / edit themes
                </Button>
            </Stack>
            {value.length ? (
                <Box className="theme-paper-labels">
                    {value.map((theme) => (
                        <ThemePaperLabel
                            key={theme}
                            theme={theme}
                            size="small"
                        />
                    ))}
                </Box>
            ) : (
                <Typography
                    variant="body2"
                    color="text.secondary"
                >
                    None recorded
                </Typography>
            )}
            <Dialog
                open={open}
                onClose={saving ? undefined : () => setOpen(false)}
                fullWidth
                maxWidth="sm"
                aria-labelledby="edit-case-themes-title"
            >
                <DialogTitle id="edit-case-themes-title">Edit case themes</DialogTitle>
                <DialogContent>
                    <Box sx={{ pt: 1 }}>
                        <CaseThemeSelector
                            value={draft}
                            onChange={setDraft}
                            disabled={saving}
                        />
                    </Box>
                </DialogContent>
                <DialogActions>
                    <Button
                        onClick={() => setOpen(false)}
                        disabled={saving}
                    >
                        Cancel
                    </Button>
                    <Button
                        variant="contained"
                        onClick={() => void save()}
                        disabled={saving}
                    >
                        {saving ? 'Saving…' : 'Save themes'}
                    </Button>
                </DialogActions>
            </Dialog>
        </Box>
    )
}
