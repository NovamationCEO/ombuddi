import ReactDOM from 'react-dom/client'
import InitColorSchemeScript from '@mui/material/InitColorSchemeScript'
import App from './App.tsx'
import './index.css'
import { colorSchemeStorageKey } from './theme/appTheme'

ReactDOM.createRoot(document.getElementById('root')!).render(
    <>
        <InitColorSchemeScript
            attribute=".mode-%s"
            defaultMode="dark"
            modeStorageKey={colorSchemeStorageKey}
        />
        <App />
    </>,
)
