import { v5 as uuidv5 } from 'uuid'
import { CodeCategoryType, CodeType } from '../types/majorTypes'

// IOA reporting categories and codes are application-level reference data,
// NOT rows in the database. They live here, in code, because:
//   - They are public, immutable in practice, and identical for every org.
//   - Treating them as a DB-resident "fake organization" forced an awkward
//     cross-tenant read exception in the multi-tenancy model.
//
// IDs are derived deterministically via uuid v5 so they are stable across
// rebuilds and identical to whatever the codebase ever emitted historically
// (the now-retired service/scripts/seed_ioa.py used the same namespace).
//
// See docs/CONTEXT.md "Settled decisions" for the rationale.

const NAMESPACE = uuidv5('ombuddi.com/ioa-seed', uuidv5.DNS)
const categoryUuid = (name: string) => uuidv5(`category:${name}`, NAMESPACE)
const codeUuid = (code: string) => uuidv5(`code:${code}`, NAMESPACE)

export const ioaCodes = [
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

export const ioaCategories = [
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

// Derived structured forms used everywhere else in the app. IOA rows are
// emitted with `organizationId: ''` because they intentionally are NOT owned
// by any organization — consumers should branch on the id being in
// `ioaCodeIdSet` rather than on `organizationId` for IOA detection.

export const ioaCodeCategories: CodeCategoryType[] = ioaCategories.map((name, index) => ({
    id: categoryUuid(name),
    organizationId: '',
    name,
    softDelete: false,
    index,
}))

export const ioaCodesFull: CodeType[] = (ioaCodes as [string, string][]).map(([code, description]) => ({
    id: codeUuid(code),
    organizationId: '',
    categoryId: categoryUuid(ioaCategories[parseInt(code[0], 10) - 1]),
    code,
    description,
    softDelete: false,
}))

export const ioaCodesById: ReadonlyMap<string, CodeType> = new Map(ioaCodesFull.map((c) => [c.id, c]))

export const ioaCodeIdSet: ReadonlySet<string> = new Set(ioaCodesFull.map((c) => c.id))
