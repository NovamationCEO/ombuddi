import Grid2 from '@mui/material/Unstable_Grid2'
import { Box } from '@mui/system'
import { MySwitch } from './MySwitch'
import { Accordion, AccordionDetails, AccordionSummary } from '@mui/material'
import React from 'react'

export const CodeSetter = React.memo(function CodeSetter(props: {
    activeCodes: string[]
    setActiveCodes: (codes: string[]) => void
    openIndex: number
    setOpenIndex: (index: number) => void
}) {
    const { activeCodes, setActiveCodes, openIndex, setOpenIndex } = props

    const codes = [
        ['1A', 'Compensation'],
        ['1B', 'Payroll'],
        ['1C', 'Benefits'],
        ['1D', 'Retirement, Pension'],
        ['1E', 'Other'],
        ['2A', 'Priorities, Values, Beliefs'],
        ['2B', 'Respect-Treatment'],
        ['2C', 'Trust-Integrity'],
        ['2D', 'Reputation'],
        ['2E', 'Communication'],
        ['2F', 'Bullying, Mobbing'],
        ['2G', 'Diversity-Related'],
        ['2H', 'Retaliation'],
        ['2I', 'Physical Violence'],
        ['2J', 'Assignments-Schedule'],
        ['2K', 'Feedback'],
        ['2L', 'Consultation'],
        ['2M', 'Performance Appraisal-Grading'],
        ['2N', 'Departmental Climate'],
        ['2O', 'Supervisory Effectiveness'],
        ['2P', 'Insubordination'],
        ['2Q', 'Discipline'],
        ['2R', 'Equity of Treatment'],
        ['2S', 'Other'],
        ['3A', 'Priorities, Values, Beliefs'],
        ['3B', 'Respect-Treatment'],
        ['3C', 'Trust-Integrity'],
        ['3D', 'Reputation'],
        ['3E', 'Communication'],
        ['3F', 'Bullying, Mobbing'],
        ['3G', 'Diversity-Related'],
        ['3H', 'Retaliation'],
        ['3I', 'Physical Violence'],
        ['3J', 'Other'],
        ['4A', 'Job Application-Selection and Recruitment Process'],
        ['4B', 'Job Classification and Description'],
        ['4C', 'Involuntary Transfer-Change in Assignment'],
        ['4D', 'Tenure-Position Security-Ambiguity'],
        ['4E', 'Career Progression'],
        ['4F', 'Rotation and Duration of Assignment'],
        ['4G', 'Resignation'],
        ['4H', 'Termination-Non-Renewal'],
        ['4I', 'Re-employment of Former or Retired Staff'],
        ['4J', 'Position Elimination'],
        ['4K', 'Career Development, Coaching, Mentoring'],
        ['4L', 'Other'],
        ['5A', 'Criminal Activity'],
        ['5B', 'Business and Financial Practices'],
        ['5C', 'Harassment'],
        ['5D', 'Discrimination'],
        ['5E', 'Disability, Temporary or Permanent, Reasonable Accommodation'],
        ['5F', 'Accessibility'],
        ['5G', 'Intellectual Property Rights'],
        ['5H', 'Privacy and Security of Information'],
        ['5I', 'Property Damage'],
        ['5J', 'Other'],
        ['6A', 'Safety'],
        ['6B', 'Physical Working-Living Conditions'],
        ['6C', 'Ergonomics'],
        ['6D', 'Cleanliness'],
        ['6E', 'Security'],
        ['6F', 'Telework-Flexplace'],
        ['6G', 'Safety Equipment'],
        ['6H', 'Environmental Policies'],
        ['6I', 'Work Related Stress and Work Life Balance'],
        ['6J', 'Other'],
        ['7A', 'Quality of Services'],
        ['7B', 'Responsiveness-Timeliness'],
        ['7C', 'Administrative Decisions and Interpretation-Application of Rules'],
        ['7D', 'Behavior of Service Provider(s)'],
        ['7E', 'Other'],
        ['8A', 'Strategic and Mission-Related-Strategic and Technical Management'],
        ['8B', 'Leadership and Management'],
        ['8C', 'Use of Positional Power-Authority'],
        ['8D', 'Communication'],
        ['8E', 'Restructuring and Relocation'],
        ['8F', 'Organizational Climate'],
        ['8G', 'Change Management'],
        ['8H', 'Priority Setting and-or Funding'],
        ['8I', 'Data, Methodology, Interpretation of Results'],
        ['8J', 'Interdepartment-Interorganization-Work-Territory'],
        ['8K', 'Other'],
        ['9A', 'Standards of Conduct'],
        ['9B', 'Values and Culture'],
        ['9C', 'Scientific conduct/integrity'],
        ['9D', 'Policies and Procedures NOT Covered in Broad Categories 1 thru 8'],
        ['9E', 'Other'],
    ]

    const categories = [
        'Compensation & Benefits',
        'Evaluative Relationships',
        'Peer and Colleague Relationships',
        'Career Progression and Development',
        'Legal, Regulatory, Financial, and Compliance',
        'Safety, Health, and Physical Environment',
        'Services/Administrative Issues',
        'Organizational, Strategic, and Mission Related',
        'Values, Ethics, and Standards',
    ]

    const handleToggle = React.useCallback(
        (codeId: string, newVal: boolean) => {
            setActiveCodes((prev) => (newVal ? [...prev, codeId] : prev.filter((c) => c !== codeId)))
        },
        [setActiveCodes],
    )

    const getLabel = React.useCallback(
        (codeId: string, codeLabel: string, isMatch: boolean) => (
            <Box
                color={isMatch ? 'forestgreen' : 'black'}
                sx={{ userSelect: 'none' }}
            >
                {codeId + ': ' + codeLabel}
            </Box>
        ),
        [],
    )

    return (
        <Grid2 container>
            {categories.map((category, index) => {
                const isExpanded = openIndex === index

                return (
                    <Accordion
                        key={category}
                        expanded={isExpanded}
                        onChange={(_, expanded) => setOpenIndex(expanded ? index : null)}
                        disableGutters
                    >
                        <AccordionSummary>
                            <Box fontWeight="bold">{category}</Box>
                        </AccordionSummary>
                        <AccordionDetails>
                            <Grid2
                                container
                                spacing={2}
                            >
                                {codes
                                    .filter((code) => code[0][0] === (index + 1).toString())
                                    .map(([codeId, codeLabel]) => {
                                        const isMatch = activeCodes.includes(codeId)
                                        return (
                                            <Grid2
                                                xs={12}
                                                sm={6}
                                                lg={4}
                                                xl={3}
                                                key={codeId}
                                            >
                                                <Box onClick={(e) => e.stopPropagation()}>
                                                    <MySwitch
                                                        value={isMatch}
                                                        setValue={(b) => handleToggle(codeId, b)}
                                                        label={getLabel(codeId, codeLabel, isMatch)}
                                                    />
                                                </Box>
                                            </Grid2>
                                        )
                                    })}
                            </Grid2>
                        </AccordionDetails>
                    </Accordion>
                )
            })}
        </Grid2>
    )
})
