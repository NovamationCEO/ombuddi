import { createBrowserRouter } from 'react-router-dom'
import { HomePage } from './pages/HomePage'
import { Page } from './components/Page'
import { ErrorElement } from './trusted-components/ErrorElement'
import { PageAlternate } from './components/PageAlternate'
import { WelcomePage } from './pages/WelcomePage'
import { Cases } from './pages/Cases'
import { ReportPage } from './pages/Report'
import { AddPerson } from './components/AddPerson/AddPerson'
import { Profile } from './pages/Profile'
import { Organization } from './pages/Organization'
import { SelectCase } from './components/LoadAllCases/SelectCase'
import { CaseSummary } from './pages/CaseSummary'
import { AddEntry } from './pages/AddEntry'
import { AddNewCase } from './components/AddEntry/AddNewCase'
import { AdminUsers } from './pages/AdminUsers'
import { AcceptInvitation } from './pages/AcceptInvitation'
import { SystemAdmin } from './pages/SystemAdmin'

export const router = createBrowserRouter([
    {
        path: '/',
        element: (
            <Page
                element={<HomePage />}
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
                hideHeader
                fullBleed
            />
        ),
    },
    { path: '/accept-invite', element: <PageAlternate element={<AcceptInvitation />} /> },
    { path: '/select_case', element: <Page element={<SelectCase />} /> },
    {
        path: '/cases',
        element: (
            <Page
                element={<Cases />}
                fullBleed
            />
        ),
    },
    { path: '/add_case', element: <Page element={<AddNewCase />} /> },
    { path: '/report', element: <Page element={<ReportPage />} /> },
    { path: '/add_person', element: <Page element={<AddPerson />} /> },
    { path: '/profile', element: <Page element={<Profile />} /> },
    { path: '/organization', element: <Page element={<Organization />} /> },
    { path: '/admin/users', element: <Page element={<AdminUsers />} /> },
    { path: '/system/orgs', element: <Page element={<SystemAdmin />} /> },
    {
        path: '/case/:caseId/add_entry',
        element: (
            <Page
                element={<AddEntry />}
                fullBleed
            />
        ),
    },
    {
        path: '/case/:caseId',
        element: (
            <Page
                element={<CaseSummary />}
                fullBleed
            />
        ),
    },
])
