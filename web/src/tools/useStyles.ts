import { useTheme } from '@mui/material/styles'
import { zIndex } from '../constants/zIndex'
import { headerHeight } from '../constants/uiSizes'

export function useStyles() {
    const theme = useTheme()
    const palette = theme.vars.palette

    const sidebar = {
        padding: 1,
        sx: { transition: '0.3s ease all', position: 'fixed' as const, bottom: 0 },
        zIndex: zIndex.sidenav,
        bgcolor: palette.background.paper,
        color: palette.text.primary,
        borderRadius: 3,
        margin: 1,
        top: `${headerHeight + 27}px`,
    }

    const horizontalBar = {
        sx: { transition: '0.3s ease all' },
        zIndex: zIndex.letterbox,
        bgcolor: palette.app.surfaceRaised,
        color: palette.text.primary,
        borderRadius: 3,
        margin: 1,
    }

    return {
        contrast: palette.text.primary,
        sidebar,
        sidebarDot: { bgcolor: palette.app.borderStrong, transition: '0.1s ease all' },
        background: { start: palette.background.default, end: palette.app.backgroundDeep },
        header: {
            bgcolor: palette.app.surfaceRaised,
            color: palette.text.primary,
            borderRadius: 3,
            margin: 1,
            boxShadow: `0 0 5px ${palette.app.shadow}`,
        },
        mainContainer: { padding: 3 },
        roundButton: {
            border: `1px solid ${palette.app.borderStrong}`,
            borderRadius: '50%',
            overflow: 'hidden',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            bgcolor: palette.background.paper,
        },
        bottomBar: horizontalBar,
        primary: palette.primary.main,
        topBar: { ...horizontalBar, top: headerHeight + 28 },
        title: { fontWeight: 'bold', color: palette.secondary.main },
        sectionNav: {
            flex: 1,
            margin: 0.5,
            borderRadius: 3,
            padding: 0.5,
            fontWeight: 'bold',
            bgcolor: palette.secondary.dark,
            color: palette.secondary.contrastText,
            textAlign: 'center',
            border: `1px solid ${palette.secondary.main}`,
            sx: { userSelect: 'none', cursor: 'pointer' },
        },
        sectionNavDisabled: {
            flex: 1,
            margin: 0.5,
            borderRadius: 3,
            padding: 0.5,
            fontWeight: 'bold',
            bgcolor: palette.action.disabledBackground,
            color: palette.text.disabled,
            cursor: 'default',
            opacity: 0.55,
            textAlign: 'center',
            border: `1px solid ${palette.divider}`,
        },
        upperNavContainer: {
            bgcolor: palette.app.surfaceRaised,
            padding: 1,
            border: `2px solid ${palette.divider}`,
            borderRadius: 2,
        },
    }
}
