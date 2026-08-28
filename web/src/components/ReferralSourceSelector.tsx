import { Box, Checkbox, CircularProgress, FormControlLabel, FormGroup, TextField, Typography } from '@mui/material'
import { usePicklists } from '../tools/usePicklists'
import { CaseReferralSourceType, PicklistType, ReferralSourceSelectionType } from '../types/majorTypes'

type ReferralSourceOption = Pick<PicklistType, 'id' | 'name' | 'behavior' | 'index'>

export function ReferralSourceSelector(props: {
    value: ReferralSourceSelectionType[]
    onChange: (value: ReferralSourceSelectionType[]) => void
    retainedSources?: CaseReferralSourceType[]
    disabled?: boolean
    showErrors?: boolean
}) {
    const { value, onChange, retainedSources = [], disabled = false, showErrors = false } = props
    const referralSources = usePicklists('referral_source')
    const retainedOptions: ReferralSourceOption[] = retainedSources.map((source, index) => ({
        id: source.id,
        name: source.name,
        behavior: source.behavior,
        index: 10_000 + index,
    }))
    const options = [...referralSources.items, ...retainedOptions]
        .filter((option, index, all) => all.findIndex((candidate) => candidate.id === option.id) === index)
        .sort((first, second) => first.index - second.index)

    function toggle(option: ReferralSourceOption, checked: boolean) {
        if (!checked) {
            onChange(value.filter((selection) => selection.id !== option.id))
            return
        }

        const nextSelection: ReferralSourceSelectionType = option.behavior === 'other_detail'
            ? { id: option.id, detail: '' }
            : { id: option.id }
        if (option.behavior === 'exclusive') {
            onChange([nextSelection])
            return
        }

        const exclusiveIds = new Set(
            options.filter((candidate) => candidate.behavior === 'exclusive').map((candidate) => candidate.id),
        )
        onChange([
            ...value.filter((selection) => selection.id !== option.id && !exclusiveIds.has(selection.id)),
            nextSelection,
        ])
    }

    function updateDetail(id: string, detail: string) {
        onChange(value.map((selection) => selection.id === id ? { ...selection, detail } : selection))
    }

    if (referralSources.isLoading && options.length === 0) {
        return (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <CircularProgress size={18} />
                <Typography variant="body2" color="text.secondary">Loading referral sources…</Typography>
            </Box>
        )
    }

    if (options.length === 0) {
        return (
            <Typography color="text.secondary" sx={{ fontStyle: 'italic' }}>
                No referral sources are configured for this organization.
            </Typography>
        )
    }

    return (
        <FormGroup>
            {options.map((option) => {
                const selection = value.find((item) => item.id === option.id)
                const missingDetail = option.behavior === 'other_detail' && !!selection && !selection.detail?.trim()
                return (
                    <Box key={option.id}>
                        <FormControlLabel
                            control={(
                                <Checkbox
                                    checked={!!selection}
                                    onChange={(event) => toggle(option, event.target.checked)}
                                    disabled={disabled}
                                />
                            )}
                            label={option.name}
                        />
                        {selection && option.behavior === 'other_detail' && (
                            <TextField
                                label="Please specify the other referral source"
                                value={selection.detail ?? ''}
                                onChange={(event) => updateDetail(option.id, event.target.value)}
                                error={showErrors && missingDetail}
                                helperText={showErrors && missingDetail
                                    ? 'Please specify the referral source.'
                                    : 'Avoid names or sensitive case details. Maximum 250 characters.'}
                                slotProps={{ htmlInput: { maxLength: 250 } }}
                                disabled={disabled}
                                size="small"
                                fullWidth
                                multiline
                                minRows={2}
                                sx={{ ml: 4, mb: 1.5, width: 'calc(100% - 32px)' }}
                            />
                        )}
                    </Box>
                )
            })}
        </FormGroup>
    )
}
