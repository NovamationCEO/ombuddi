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
import { AddEntryBackup } from './pages/AddEntryBackup'

export const router = createBrowserRouter([
    {
        path: '/',
        element: <Page element={<HomePage />} />,
        errorElement: <ErrorElement />,
    },
    { path: '/welcome', element: <PageAlternate element={<WelcomePage />} /> },
    { path: '/select_case', element: <Page element={<SelectCase />} /> },
    { path: '/cases', element: <Page element={<Cases />} /> },
    { path: '/report', element: <Page element={<ReportPage />} /> },
    { path: '/add_person', element: <Page element={<AddPerson />} /> },
    { path: '/profile', element: <Page element={<Profile />} /> },
    { path: '/organization', element: <Page element={<Organization />} /> },
    { path: '/case/:caseId/add_entry', element: <Page element={<AddEntryBackup />} /> },
    { path: '/case/:caseId', element: <Page element={<CaseSummary />} /> },
])
