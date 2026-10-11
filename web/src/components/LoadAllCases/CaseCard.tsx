import { Check, LockOpenOutlined, LockOutlined } from '@mui/icons-material'
import { ButtonBase, Tooltip } from '@mui/material'
import type { CaseType } from '../../types/majorTypes'
import { useProtectedText } from '../../tools/useProtectedText'
import { useResolvedCaseCodes } from '../../tools/useResolvedCaseCodes'
import { CaseSceneThumbnail } from '../CaseSceneThumbnail'
import { ThemePaperLabel } from '../ThemePaperLabel'
import { CaseLabelRow } from './CaseLabelRow'
import './caseWorkspace.css'

export function CaseCard({
    caseItem,
    selected,
    onSelect,
}: {
    caseItem: CaseType
    selected: boolean
    onSelect: () => void
}) {
    const description = useProtectedText(caseItem.description, caseItem.organizationId, 'default', '')
    const codes = useResolvedCaseCodes(caseItem.codes ?? [])
    const themes = caseItem.themes ?? []
    return (
        <ButtonBase
            className={`case-file case-file--${caseItem.status} ${selected ? 'case-file--selected' : ''}`}
            onClick={onSelect}
            aria-label={`Inspect ${caseItem.name}`}
            aria-pressed={selected}
            aria-description={`Status: ${caseItem.status}`}
            data-case-card={caseItem.id}
        >
            <span className="case-file-tab">
                Updated {new Date(caseItem.updatedAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
            </span>
            {selected && (
                <span
                    className="case-file-selection"
                    aria-hidden="true"
                >
                    <Check fontSize="inherit" /> Selected
                </span>
            )}
            <span className="case-file-paper">
                <span className="case-file-heading">
                    <span className="case-file-thumbnail">
                        <CaseSceneThumbnail seed={caseItem.id} />
                    </span>
                    <span className="case-file-name">{caseItem.name}</span>
                    <span className={`case-file-status case-file-status--${caseItem.status}`}>{caseItem.status}</span>
                </span>
                <span className="case-file-description">
                    {description.plaintext === null ? (
                        <>
                            <LockOutlined />
                            {description.status === 'decrypting' ? 'Unlocking description…' : 'Protected description'}
                        </>
                    ) : (
                        <>
                            {description.encrypted && <LockOpenOutlined aria-label="Decrypted; stored encrypted" />}
                            <span>{description.plaintext || 'No description recorded.'}</span>
                        </>
                    )}
                </span>
                <span className="case-file-labels">
                    {!!codes.length && (
                        <CaseLabelRow
                            kind="codes"
                            items={codes.map((code) => ({
                                id: code.id,
                                content: (
                                    <Tooltip title={`${code.shortName}: ${code.description}`}>
                                        <span className="case-file-code">{code.shortName}</span>
                                    </Tooltip>
                                ),
                            }))}
                        />
                    )}
                    {!!themes.length && (
                        <CaseLabelRow
                            kind="themes"
                            items={themes.map((theme) => ({
                                id: theme,
                                content: (
                                    <ThemePaperLabel
                                        theme={theme}
                                        component="span"
                                        size="small"
                                    />
                                ),
                            }))}
                        />
                    )}
                    {!codes.length && !themes.length && (
                        <span className="case-file-unclassified">No codes or themes yet</span>
                    )}
                </span>
            </span>
        </ButtonBase>
    )
}
