import { createBrowserRouter } from 'react-router-dom'
import { HomePage } from './pages/HomePage'
import { Page } from './components/Page'
import { ErrorElement } from './trusted-components/ErrorElement'
import { PageAlternate } from './components/PageAlternate'
import { WelcomePage } from './pages/WelcomePage'
import { AddEntry } from './pages/AddEntry'
import { Cases } from './pages/Cases'
import { ReportPage } from './pages/Report'

export const router = createBrowserRouter([
    {
        path: '/',
        element: <Page element={<HomePage />} />,
        errorElement: <ErrorElement />,
    },
    { path: '/welcome', element: <PageAlternate element={<WelcomePage />} /> },
    { path: '/add_entry', element: <Page element={<AddEntry />} /> },
    { path: '/cases', element: <Page element={<Cases />} /> },
    { path: '/report', element: <Page element={<ReportPage />} /> },
])
