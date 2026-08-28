import casesImage from '../assets/images/cases.png'
import planningBoardImage from '../assets/images/planning-board.png'
import profileImage from '../assets/images/profile.png'
import reportImage from '../assets/images/report.png'

export type Destination = {
    name: string
    url: string
    image: string
    description: string
    action: string
}

export const destinations: Destination[] = [
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
