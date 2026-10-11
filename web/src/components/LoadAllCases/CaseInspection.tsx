import { ArrowForward } from '@mui/icons-material'
import { Button, CircularProgress } from '@mui/material'
import type { CaseType, PersonType } from '../../types/majorTypes'
import { useResolvedCaseCodes } from '../../tools/useResolvedCaseCodes'
import { CaseSceneThumbnail } from '../CaseSceneThumbnail'
import { ProtectedText } from '../ProtectedText'
import { ThemePaperLabel } from '../ThemePaperLabel'
import { useGetter } from '../../tools/db_tools/useGetter'
import { EntryPersonMarker } from '../EntryPersonMarker'
import { uniquePeopleById } from '../personDisplay'
import './caseWorkspace.css'

export function CaseInspection({ caseItem, onOpen }: { caseItem: CaseType; onOpen: () => void }) {
    const codes = useResolvedCaseCodes(caseItem.codes ?? [])
    const peopleRes = useGetter<PersonType[]>(['get_persons_by_case_id', caseItem.id])
    const people = uniquePeopleById(peopleRes.data ?? [])
    const themes = caseItem.themes ?? []
    const formatDate = (date: Date) =>
        new Date(date).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
    return (
        <section
            className="case-inspection-folder"
            aria-label={`Quick look: ${caseItem.name}`}
        >
            <div className="case-inspection-paper">
                <div className="case-inspection-scroll">
                    <header className="case-inspection-heading">
                        <div className="case-inspection-thumbnail">
                            <CaseSceneThumbnail seed={caseItem.id} />
                        </div>
                        <div>
                            <h2>{caseItem.name}</h2>
                            <span className={`case-file-status case-file-status--${caseItem.status}`}>
                                {caseItem.status}
                            </span>
                        </div>
                    </header>
                    <section className="case-inspection-section">
                        <h3>Summary</h3>
                        <ProtectedText
                            key={`${caseItem.id}:${caseItem.description}`}
                            stored={caseItem.description}
                            organizationId={caseItem.organizationId}
                            emptyText="No description recorded."
                            compact
                        />
                    </section>
                    <section
                        className="case-inspection-section"
                        aria-label="Associated people"
                    >
                        <h3>
                            People{' '}
                            {!peopleRes.isLoading && !peopleRes.isError && (
                                <span className="case-inspection-count">{people.length}</span>
                            )}
                        </h3>
                        {peopleRes.isLoading ? (
                            <CircularProgress
                                size={18}
                                aria-label="Loading case people"
                            />
                        ) : peopleRes.isError ? (
                            <div
                                role="status"
                                className="case-inspection-empty"
                            >
                                People could not be loaded.
                                <Button
                                    size="small"
                                    onClick={() => void peopleRes.refetch()}
                                >
                                    Retry people
                                </Button>
                            </div>
                        ) : people.length ? (
                            <div className="case-inspection-people">
                                {people.map((person) => (
                                    <EntryPersonMarker
                                        key={person.id}
                                        person={person}
                                    />
                                ))}
                            </div>
                        ) : (
                            <p className="case-inspection-empty">No people added.</p>
                        )}
                    </section>
                    <section className="case-inspection-section">
                        <h3>
                            Codes <span className="case-inspection-count">{codes.length}</span>
                        </h3>
                        {codes.length ? (
                            <ul className="case-inspection-codes">
                                {codes.map((code) => (
                                    <li key={code.id}>
                                        <span className="case-file-code">{code.shortName}</span>
                                        <span>{code.description}</span>
                                    </li>
                                ))}
                            </ul>
                        ) : (
                            <p className="case-inspection-empty">No codes added.</p>
                        )}
                    </section>
                    <section className="case-inspection-section">
                        <h3>
                            Themes <span className="case-inspection-count">{themes.length}</span>
                        </h3>
                        {themes.length ? (
                            <div className="theme-paper-labels">
                                {themes.map((theme) => (
                                    <ThemePaperLabel
                                        key={theme}
                                        theme={theme}
                                        size="small"
                                    />
                                ))}
                            </div>
                        ) : (
                            <p className="case-inspection-empty">No themes added.</p>
                        )}
                    </section>
                </div>
                <footer className="case-inspection-footer">
                    <div>
                        Updated {formatDate(caseItem.updatedAt)}
                        <small>Created {formatDate(caseItem.createdAt)}</small>
                    </div>
                    <Button
                        variant="contained"
                        size="small"
                        endIcon={<ArrowForward />}
                        onClick={onOpen}
                    >
                        Open case
                    </Button>
                </footer>
            </div>
        </section>
    )
}
