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
