import { createTheme } from '@mui/material/styles'

type AppPalette = {
    backgroundDeep: string
    surfaceRaised: string
    surfaceTint: string
    borderStrong: string
    blueGreen: string
    shadow: string
    headerStart: string
    headerEnd: string
    headerText: string
    headerMuted: string
    headerBorder: string
    headerHover: string
}

declare module '@mui/material/styles' {
    interface Palette {
        app: AppPalette
    }

    interface PaletteOptions {
        app?: AppPalette
    }
}

const lightPalette = {
    mode: 'light' as const,
    background: {
        default: '#F2F6F5',
        paper: '#FFFFFF',
    },
    text: {
        primary: '#183337',
        secondary: '#647578',
        disabled: '#829593',
    },
    divider: '#D7E1DF',
    primary: {
        light: '#9A6CAE',
        main: '#875C9B',
        dark: '#70477F',
        contrastText: '#FFFFFF',
    },
    secondary: {
        light: '#8CB5B2',
        main: '#2F6668',
        dark: '#234E51',
        contrastText: '#FFFFFF',
    },
    error: { main: '#B53A2D' },
    warning: { main: '#A96F17' },
    info: { main: '#527C80' },
    success: { main: '#2F6D51' },
    action: {
        hover: 'rgba(47, 102, 104, 0.07)',
        selected: 'rgba(135, 92, 155, 0.12)',
        disabledBackground: 'rgba(24, 51, 55, 0.08)',
    },
    app: {
        backgroundDeep: '#E3ECEA',
        surfaceRaised: '#F7FAF9',
        surfaceTint: '#EAF3F2',
        borderStrong: '#AEBFBD',
        blueGreen: '#2F6668',
        shadow: 'rgba(24, 51, 55, 0.12)',
        headerStart: '#2F6668',
        headerEnd: '#234E51',
        headerText: '#FFFFFF',
        headerMuted: '#D4E3E1',
        headerBorder: 'rgba(255, 255, 255, 0.2)',
        headerHover: 'rgba(255, 255, 255, 0.1)',
    },
}

const darkPalette = {
    mode: 'dark' as const,
    background: {
        default: '#10272B',
        paper: '#193438',
    },
    text: {
        primary: '#F3F2EC',
        secondary: '#B6C5C3',
        disabled: '#7F9492',
    },
    divider: 'rgba(202, 220, 218, 0.2)',
    primary: {
        light: '#C4A7D0',
        main: '#9A6CAE',
        dark: '#875C9B',
        contrastText: '#FFFFFF',
    },
    secondary: {
        light: '#B9D1CF',
        main: '#8CB5B2',
        dark: '#2F6668',
        contrastText: '#10272B',
    },
    error: { main: '#F06A5C' },
    warning: { main: '#D9A85E' },
    info: { main: '#8CB5B2' },
    success: { main: '#79B692' },
    action: {
        hover: 'rgba(202, 220, 218, 0.08)',
        selected: 'rgba(154, 108, 174, 0.2)',
        disabledBackground: 'rgba(202, 220, 218, 0.08)',
    },
    app: {
        backgroundDeep: '#0B1D20',
        surfaceRaised: '#204146',
        surfaceTint: '#234E51',
        borderStrong: 'rgba(202, 220, 218, 0.34)',
        blueGreen: '#8CB5B2',
        shadow: 'rgba(3, 18, 21, 0.28)',
        headerStart: '#102D31',
        headerEnd: '#1F4B4F',
        headerText: '#F3F2EC',
        headerMuted: '#BDD0CE',
        headerBorder: 'rgba(202, 220, 218, 0.2)',
        headerHover: 'rgba(255, 255, 255, 0.08)',
    },
}

export const colorSchemeStorageKey = 'ombuddi-color-scheme'

export const appTheme = createTheme({
    cssVariables: {
        colorSchemeSelector: '.mode-%s',
    },
    colorSchemes: {
        light: { palette: lightPalette },
        dark: { palette: darkPalette },
    },
    defaultColorScheme: 'dark',
    typography: {
        fontSize: 16,
        fontFamily: 'Inter, system-ui, Avenir, Helvetica, Arial, sans-serif',
    },
    components: {
        MuiButton: {
            styleOverrides: {
                root: { textTransform: 'none', fontWeight: 650 },
            },
        },
        MuiPaper: {
            styleOverrides: {
                root: { backgroundImage: 'none' },
            },
        },
    },
})
