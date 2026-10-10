import { Add, Close } from '@mui/icons-material'
import { Box, Button, IconButton, Stack, Typography } from '@mui/material'
import React from 'react'
import { CodeSource, useCodeSource } from '../../tools/useCodeSource'
import { OrgCodeSetter } from '../OrgCodeSetter'
import { caseCodeFlagStyle } from '../caseCodeFlagStyle'

export function CaseCodeFlags({
    caseId,
    source,
    activeCodes,
    setActiveCodes,
    disabled,
}: {
    caseId: string
    source: CodeSource
    activeCodes: string[]
    setActiveCodes: (codes: string[]) => void
    disabled: boolean
}) {
    const [open, setOpen] = React.useState(false)
    const { codes, isReady } = useCodeSource(source)
    const isIoa = source.kind === 'ioa'
    const title = isIoa ? 'IOA Codes' : 'Organization Codes'
    const selectedCodes = codes
        .filter((code) => activeCodes.includes(code.id))
        .sort((a, b) => a.code.localeCompare(b.code, undefined, { numeric: true }))

    return (
        <Box
            component="section"
            aria-label={title}
        >
            <Typography
                component="h2"
                variant="overline"
                sx={{ letterSpacing: '0.14em', fontWeight: 700 }}
            >
                {title}
            </Typography>
            <Stack
                spacing={2}
                sx={{ mt: 2, mb: 1 }}
            >
                {selectedCodes.map((code) => (
                    <Box
                        key={code.id}
                        className={`case-code-flag${isIoa ? '' : ' case-code-flag--org'}`}
                        style={caseCodeFlagStyle(caseId, code.id)}
                    >
                        <Button
                            disabled={disabled}
                            onClick={() => setOpen(true)}
                            aria-label={`Edit ${title}: ${code.code} ${code.description}`}
                            sx={{
                                flex: 1,
                                minWidth: 0,
                                justifyContent: 'flex-start',
                                color: 'text.primary',
                                textAlign: 'left',
                                fontWeight: 500,
                                overflowWrap: 'anywhere',
                                py: 1.25,
                            }}
                        >
                            <span>
                                <b>{code.code}</b> {code.description}
                            </span>
                        </Button>
                        <IconButton
                            size="small"
                            disabled={disabled}
                            aria-label={`Remove ${title}: ${code.code} ${code.description}`}
                            onClick={() => setActiveCodes(activeCodes.filter((id) => id !== code.id))}
                            sx={{ width: 36, height: 36, flexShrink: 0, color: 'text.primary' }}
                        >
                            <Close fontSize="small" />
                        </IconButton>
                    </Box>
                ))}
            </Stack>
            <Button
                startIcon={<Add />}
                onClick={() => setOpen(true)}
                disabled={disabled || !isReady}
                sx={{ color: 'secondary.dark', textDecoration: 'underline', textUnderlineOffset: '3px' }}
            >
                {isReady ? (isIoa ? 'Add IOA code' : 'Add org code') : 'Loading codes…'}
            </Button>
            <OrgCodeSetter
                source={source}
                activeCodes={activeCodes}
                setActiveCodes={setActiveCodes}
                showCodeSetter={open}
                setShowCodeSetter={setOpen}
            />
        </Box>
    )
}
