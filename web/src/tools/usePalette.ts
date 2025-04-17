import { useTheme } from '@mui/material'

export function usePalette() {
    const theme = useTheme()

    return {
        primary: {
            bgcolor: theme.palette.primary.main,
            color: theme.palette.primary.contrastText,
        },
        secondary: {
            bgcolor: theme.palette.secondary.main,
            color: theme.palette.secondary.contrastText,
        },
        warning: {
            bgcolor: theme.palette.warning.main,
            color: theme.palette.warning.contrastText,
        },
        error: {
            bgcolor: theme.palette.error.main,
            color: theme.palette.error.contrastText,
        },
        primaryLight: {
            bgcolor: theme.palette.primary.light,
            color: theme.palette.primary.contrastText,
        },
        primaryDark: {
            bgcolor: theme.palette.primary.dark,
            color: theme.palette.primary.contrastText,
        },
        info: {
            bgcolor: theme.palette.info.main,
            color: theme.palette.info.contrastText,
        },
        secondaryLight: {
            bgcolor: theme.palette.secondary.light,
            color: theme.palette.secondary.contrastText,
        },
    }
}
