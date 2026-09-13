import { createBrowserRouter } from 'react-router-dom'
import { Page } from './components/Page'
import { ErrorElement } from './trusted-components/ErrorElement'
import { PageAlternate } from './components/PageAlternate'
import {
    AcceptInvitation,
    AddEntry,
    AddNewCase,
    AddPerson,
    AdminUsers,
    Cases,
    CaseSummary,
    HomePage,
    Organization,
    Profile,
    ReportPage,
    SelectCase,
    SystemAdmin,
    WelcomePage,
} from './routeComponents'

export const router = createBrowserRouter([
    {
        path: '/',
        element: (
            <Page
                element={<HomePage />}
                title="Home"
                description="Your private Ombuddi workspace for confidential case work."
                fullBleed
            />
        ),
        errorElement: <ErrorElement />,
    },
    {
        path: '/welcome',
        element: (
            <PageAlternate
                element={<WelcomePage />}
                title="Confidential Case Management for Ombuds"
                description="Secure, purpose-built case management and reporting software for organizational ombuds."
                indexable
                canonicalPath="/welcome"
                hideHeader
                fullBleed
                fixedColorScheme="dark"
            />
        ),
    },
    {
        path: '/accept-invite',
        element: (
            <PageAlternate
                element={<AcceptInvitation />}
                title="Accept Invitation"
                description="Accept an invitation to join an Ombuddi organization."
            />
        ),
    },
    { path: '/select_case', element: <Page element={<SelectCase />} title="Select Case" /> },
    {
        path: '/cases',
        element: (
            <Page
                element={<Cases />}
                title="Cases"
                description="Review and manage confidential ombuds case records."
                fullBleed
            />
        ),
    },
    {
        path: '/add_case',
        element: (
            <Page
                element={<AddNewCase />}
                title="New Case"
                description="Create a confidential ombuds case record."
                fullBleed
            />
        ),
    },
    {
        path: '/report',
        element: (
            <Page
                element={<ReportPage />}
                title="Reports"
                description="Create protected summaries of ombuds activity."
                fullBleed
            />
        ),
    },
    { path: '/add_person', element: <Page element={<AddPerson />} title="Add Person" /> },
    {
        path: '/profile',
        element: (
            <Page
                element={<Profile />}
                title="Profile"
                description="Manage your Ombuddi profile, security phrase, and appearance settings."
                fullBleed
            />
        ),
    },
    {
        path: '/organization',
        element: (
            <Page
                element={<Organization />}
                title="Organization Settings"
                description="Manage organization terminology, roles, people, and entry options."
                fullBleed
            />
        ),
    },
    { path: '/admin/users', element: <Page element={<AdminUsers />} title="Manage Users" /> },
    { path: '/system/orgs', element: <Page element={<SystemAdmin />} title="System Administration" /> },
    {
        path: '/case/:caseId/add_entry',
        element: (
            <Page
                element={<AddEntry />}
                title="Add Case Entry"
                description="Add a protected entry to an ombuds case."
                fullBleed
            />
        ),
    },
    {
        path: '/case/:caseId/entry/:entryId/edit',
        element: (
            <Page
                element={<AddEntry />}
                title="Edit Case Entry"
                description="Edit a protected entry on an ombuds case."
                fullBleed
            />
        ),
    },
    {
        path: '/case/:caseId',
        element: (
            <Page
                element={<CaseSummary />}
                title="Case Summary"
                description="Review a confidential ombuds case and its protected entries."
                fullBleed
            />
        ),
    },
])
