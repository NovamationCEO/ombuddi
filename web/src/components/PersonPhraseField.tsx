import { ContentPasteOutlined, Visibility, VisibilityOff } from '@mui/icons-material'
import { Button, IconButton, InputAdornment, Stack, TextField } from '@mui/material'
import { useState } from 'react'
import { useSessionSalt } from '../libraries/useSessionSalt'

/** A draft only: copying the default never submits a search or saves a person. */
export function PersonPhraseField({
    value,
    onChange,
    label = 'Phrase',
    disabled = false,
}: {
    value: string
    onChange: (value: string) => void
    label?: string
    disabled?: boolean
}) {
    const defaultPhrase = useSessionSalt((state) => state.sessionSalt)
    const [visible, setVisible] = useState(false)
    return (
        <Stack spacing={0.5}>
            <TextField
                label={label}
                value={value}
                onChange={(event) => onChange(event.target.value)}
                type={visible ? 'text' : 'password'}
                disabled={disabled}
                variant="standard"
                fullWidth
                autoComplete="off"
                slotProps={{
                    htmlInput: { 'data-1p-ignore': '', 'data-op-ignore': '' },
                    input: {
                        endAdornment: (
                            <InputAdornment position="end">
                                <IconButton
                                    type="button"
                                    size="small"
                                    disabled={disabled}
                                    aria-label={visible ? `Hide ${label.toLowerCase()}` : `Show ${label.toLowerCase()}`}
                                    onClick={() => setVisible(!visible)}
                                >
                                    <>{visible ? <VisibilityOff /> : <Visibility />}</>
                                </IconButton>
                            </InputAdornment>
                        ),
                    },
                }}
            />
            <Button
                type="button"
                size="small"
                startIcon={<ContentPasteOutlined />}
                disabled={disabled || !defaultPhrase}
                onClick={() => onChange(defaultPhrase ?? '')}
                sx={{ alignSelf: 'flex-start' }}
            >
                Copy default phrase
            </Button>
        </Stack>
    )
}
