import { createTheme } from '@mui/material/styles'
import { appTheme, lightPalette } from '../../theme/appTheme'

// This physical writing surface stays light inside either site color scheme.
// A non-variable theme also keeps inputs, dialogs and focus states legible on it.
export const caseFolderTheme = createTheme({
    palette: {
        ...lightPalette,
        primary: { main: '#743D68', dark: '#592B50', light: '#956A8C', contrastText: '#FFFFFF' },
        text: { primary: '#273334', secondary: '#62696A' },
        divider: '#DDDFDB',
    },
    typography: appTheme.typography,
    components: appTheme.components,
})
