import casesImage from '../assets/images/cases.png'
import adminUsersImage from '../assets/images/admin-users.png'
import planningBoardImage from '../assets/images/planning-board.png'
import profileImage from '../assets/images/profile.png'
import reportImage from '../assets/images/report.png'
import systemAdminImage from '../assets/images/system-admin.png'

export type Destination = {
    name: string
    url: string
    image: string
    description: string
    action: string
    requiredRole?: 'admin' | 'systemAdmin'
}

export const primaryDestinations: Destination[] = [
    {
        name: 'Cases',
        url: '/cases',
        image: casesImage,
        description: 'View and continue your active case work.',
        action: 'View cases',
    },
    {
        name: 'Reports',
        url: '/report',
        image: reportImage,
        description: 'Generate a protected annual reporting summary.',
        action: 'Create report',
    },
]

export const secondaryDestinations: Destination[] = [
    {
        name: 'Profile',
        url: '/profile',
        image: profileImage,
        description: 'Manage your practitioner information.',
        action: 'Open profile',
    },
    {
        name: 'Organization Settings',
        url: '/organization',
        image: planningBoardImage,
        description: 'Manage organization terminology, roles, people, and entry options.',
        action: 'Open settings',
    },
]

export const destinations: Destination[] = [...primaryDestinations, ...secondaryDestinations]

export const adminDestinations: Destination[] = [
    {
        name: 'Manage Users',
        url: '/admin/users',
        image: adminUsersImage,
        description: 'Manage practitioner access, invitations, and organization seats.',
        action: 'Manage users',
        requiredRole: 'admin',
    },
    {
        name: 'System Administration',
        url: '/system/orgs',
        image: systemAdminImage,
        description: 'Manage Ombuddi organizations and subscription access.',
        action: 'Open system administration',
        requiredRole: 'systemAdmin',
    },
]

export function getVisibleAdminDestinations(access?: { isAdmin: boolean; isSystemAdmin: boolean }) {
    return adminDestinations.filter((destination) => {
        if (destination.requiredRole === 'admin') return Boolean(access?.isAdmin)
        if (destination.requiredRole === 'systemAdmin') return Boolean(access?.isSystemAdmin)
        return false
    })
}
