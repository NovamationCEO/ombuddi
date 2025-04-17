export type UMApplicationType = {
    id: string
    name: string
    displayName: string
}

export type UMAvailableProjectsType = {
    id: string
    name: string
    description: string
    applicationId: string
    createdDate: string
    modifiedDate: string
    ownerId: string
    dataPath: string
    roleId: number
}

export type UMProjectUsersType = {
    id: string
    email: string
    firstName: string
    lastName: string
    roleId: number
    roleName: string
}

export type UMUserType = {
    id: string
    email: string
    firstName: string
    lastName: string
}

export type UMRoleType = {
    id: number
    name: string
}

export type UMProjectType = {
    id: string
    name: string
    description: string
    applicationId: string
    createdDate: string
    modifiedDate: string
    ownerId: string
    dataPath: string
}

export type UserProject = {
    userId: string
    projectId: string
    roleId: number
    assignedDate: string
}
