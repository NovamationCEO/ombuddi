export type CaseType = {
    id: string
    name: string
    description: string
    imageSeed: string
    startDate: Date
    isClosed: boolean
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
    gender: string
    generation: string
    race: string
    primaryRole: string
    isInternational: boolean
    category1: string
    category2: string
    category3: string
}
