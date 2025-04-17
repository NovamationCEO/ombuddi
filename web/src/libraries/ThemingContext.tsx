// ThemeContext.tsx
import { createContext, useContext, useState } from 'react'
import { Theme } from '@mui/material'
import { themes } from '../theme/themes'

interface ThemingContextType {
    theme: Theme
    setTheme: (theme: Theme) => void
}

// Create a context with a default value
const ThemingContext = createContext<ThemingContextType>({
    theme: themes.light.theme, // Default theme
    setTheme: () => {},
})

// eslint-disable-next-line react-refresh/only-export-components
export const useThemingContext = () => useContext(ThemingContext)

export const ThemingProvider = (props: { children: JSX.Element }) => {
    const [theme, setTheme] = useState(themes.light.theme)

    return <ThemingContext.Provider value={{ theme, setTheme }}>{props.children}</ThemingContext.Provider>
}
