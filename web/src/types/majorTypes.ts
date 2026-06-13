export type CaseType = {
    id: string
    organizationId: string
    name: string
    description: string
    codes: string[]
    status: string
    createdAt: Date
    updatedAt: Date
}

export type OrganizationType = {
    id: string
    name: string
}

export type OmbudsType = {
    id: string
    name: string
    organizationId: string
}

export type CodeCategoryType = {
    id: string
    organizationId: string
    name: string
    softDelete: boolean
    index: number
}

export type CodeType = {
    id: string
    organizationId: string
    categoryId: string
    softDelete: boolean
    code: string
    description: string
}

export type PersonType = {
    id: string
    hashedName: string
    publicName?: string
    isPublic?: boolean
    gender: string
    generation: string
    race: string
    primaryRole: string
    isInternational: boolean
    category1: string
    category2: string
    category3: string
    organizationId: string
}

export type PrimaryRoleType = {
    id: string
    organizationId: string
    name: string
    index: string
    softDelete: boolean
}

export type PicklistType = {
    id: string
    organizationId: string
    /**
     * Discriminator: which list this row belongs to. Examples today:
     * 'medium', 'priority'. Future: 'ombuds_action', 'referral_source',
     * 'case_contact', 'risk_level'. Keep this in lockstep with the kind
     * strings the UI hard-codes in `usePicklists(kind)` calls.
     */
    kind: string
    name: string
    description: string
    index: number
    softDelete: boolean
}

export type EntryType = {
    id: string
    caseId: string
    ombudsId: string
    organizationId: string
    date: Date
    medium: string
    duration: number
    notes: string
    codes: string[]
}
