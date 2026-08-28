import { PrimaryRoleType } from '../../types/majorTypes'

const DEFAULT_PRIMARY_ROLES = [
    { value: 'exempt', label: 'Exempt / Professional Staff' },
    { value: 'nonexempt', label: 'Non-Exempt / Hourly Staff' },
    { value: 'tenure', label: 'Tenure-Track Faculty' },
    { value: 'non-tenure', label: 'Non-Tenure Track Faculty' },
    { value: 'undergrad', label: 'Undergraduate Student' },
    { value: 'grad', label: 'Graduate Student' },
    { value: 'former-student', label: 'Former Student' },
    { value: 'alumni', label: 'Alumni' },
    { value: 'former-employee', label: 'Former Employee' },
    { value: 'parent', label: 'Parent / Relative' },
    { value: 'other', label: 'Other' },
]

export function getPrimaryRoleOptions(configuredRoles: PrimaryRoleType[], isLoading: boolean) {
    if (isLoading) return []
    const organizationOptions = configuredRoles.length > 0
        ? configuredRoles.map((role) => ({ value: role.name, label: role.name }))
        : DEFAULT_PRIMARY_ROLES
    return [{ value: 'unknown', label: 'Unknown' }, ...organizationOptions]
}
