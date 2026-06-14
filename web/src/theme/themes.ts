import { createTheme, darken, lighten } from '@mui/material'
import { zIndex } from '../constants/zIndex'
import { headerHeight } from '../constants/uiSizes'

const fontBoost = {
    typography: {
        fontSize: 16,
    },
}

const primary = {
    light: '#53AE61FF',
    dark: '#5EB1BF',
}

const secondary = {
    light: '#5E8568FF',
    dark: '#35605A',
}

const myBlack = '#08151a'
const myWhite = '#eeeeee'

const sidebarBase = {
    padding: 1,
    sx: { transition: '0.3s ease all', position: 'fixed', bottom: 0 },
    zIndex: zIndex.sidenav,
}

const sidebarDot = {
    light: { bgcolor: '#95BBC6FF' },
    dark: { bgcolor: '#5D747DFF' },
}
const sidebar = {
    light: {
        ...sidebarBase,
        bgcolor: '#9EC5ABFF',
        color: myBlack,
        borderRadius: 0,
        margin: 0,
        top: `${headerHeight + 16}px`,
    },
    dark: {
        ...sidebarBase,
        bgcolor: '#404d52',
        color: myWhite,
        borderRadius: 4,
        margin: 1,
        top: `${headerHeight + 27}px`,
    },
}

const horizBar = {
    light: {
        sx: { transition: '0.3s ease all' },
        zIndex: zIndex.letterbox,
        bgcolor: '#CDEDF6',
        color: myBlack,
        borderRadius: 0,
        margin: 0,
    },
    dark: {
        sx: { transition: '0.3s ease all' },
        zIndex: zIndex.letterbox,
        bgcolor: '#404d52',
        color: myWhite,
        borderRadius: 4,
        margin: 1,
    },
}

const header = {
    light: {
        bgcolor: primary.light,
        color: myBlack,
        borderRadius: 0,
        margin: 0,
    },
    dark: {
        bgcolor: '#28373c',
        color: myWhite,
        borderRadius: 4,
        margin: 1,
        boxShadow: '0px 0px 5px #212a2f',
    },
}

const roundButtonBase = {
    border: `1px solid ${primary.light}`,
    borderRadius: '50%',
    overflow: 'hidden',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
}

const sectionNavBase = {
    flex: 1,
    margin: 0.5,
    borderRadius: 3,
    padding: 0.5,
    sx: { cursor: 'pointer' },
    fontWeight: 'bold',
}

export const themes = {
    light: {
        id: 'light01',
        name: 'Light Theme 1',
        styles: {
            contrast: myBlack,
            sidebar: {
                ...sidebar.light,
            },
            sidebarDot: {
                ...sidebarDot.light,
            },
            // background: { start: lighten(primary.light, 0.95), end: lighten(primary.light, 0.99) },
            background: { start: 'rgb(253, 246, 227)', end: 'rgb(243, 236, 217)' },
            header: { ...header.light },
            mainContainer: {
                padding: 3,
            },
            roundButton: { ...roundButtonBase, bgcolor: myWhite },
            bottomBar: horizBar.light,
            primary: primary.light,
            topBar: { ...horizBar.light, top: headerHeight + 15 },
            title: {
                fontWeight: 'bold',
                color: '#264653',
            },
            sectionNav: {
                ...sectionNavBase,
                bgcolor: lighten(secondary.light, 0.2),
                color: myBlack,
                textAlign: 'center',
                border: `1px solid ${lighten(secondary.light, 0.2)}`,
                sx: { userSelect: 'none', cursor: 'pointer' },
            },
            sectionNavDisabled: {
                ...sectionNavBase,
                bgcolor: lighten(secondary.light, 0.7),
                color: myBlack,
                cursor: 'default',
                opacity: 0.3,
                textAlign: 'center',
                border: `1px solid ${secondary.light}`,
            },
            upperNavContainer: {
                bgcolor: lighten(secondary.light, 0.8),
                padding: 1,
                border: `2px solid ${secondary.light}`,
                borderRadius: 2,
            },
        },

        theme: createTheme({
            ...fontBoost,
            palette: {
                primary: {
                    main: primary.light,
                    contrastText: '#264653',
                },
                secondary: {
                    main: '#CDEDF6',
                    contrastText: '#264653',
                },
                error: {
                    main: '#D84727',
                },
                warning: {
                    main: '#F58A07',
                },
                info: {
                    main: '#A379C9',
                },
                success: {
                    main: '#09814A',
                },
                text: {
                    primary: myBlack,
                },
            },
            components: {
                MuiIconButton: {
                    styleOverrides: {
                        root: {
                            color: myBlack,
                        },
                    },
                },
                MuiTextField: {
                    styleOverrides: {
                        root: {
                            color: myBlack,
                        },
                    },
                },
                MuiInputLabel: {
                    styleOverrides: {
                        root: {
                            color: myBlack,
                        },
                    },
                },
                MuiAccordionSummary: {
                    styleOverrides: {
                        root: {
                            color: myBlack,
                            backgroundColor: lighten(primary.light, 0.5),
                        },
                    },
                },
                MuiAccordionDetails: {
                    styleOverrides: {
                        root: {
                            backgroundColor: lighten(primary.light, 0.99),
                        },
                    },
                },
            },
        }),
    },
    dark: {
        id: 'dark01',
        name: 'Dark 1',
        styles: {
            contrast: myWhite,
            sidebar: {
                ...sidebar.dark,
                transition: '0.2s ease all',
            },
            sidebarDot: {
                ...sidebarDot.dark,
                transition: '0.1s ease all',
            },
            background: { start: myBlack, end: '#28373c' },
            header: {
                ...header.dark,
            },
            mainContainer: {
                padding: 2,
            },
            roundButton: { ...roundButtonBase, bgcolor: myBlack },
            bottomBar: horizBar.dark,
            primary: primary.dark,
            topBar: { ...horizBar.dark, top: headerHeight + 28 },
            title: {
                fontWeight: 'bold',
                color: '#5eb1bf',
            },
            sectionNav: {
                ...sectionNavBase,
                bgcolor: darken(secondary.dark, 0.3),
                color: myWhite,
                textAlign: 'center',
                border: `1px solid ${darken(secondary.dark, 0.3)}`,
                sx: { userSelect: 'none', cursor: 'pointer' },
            },
            sectionNavDisabled: {
                ...sectionNavBase,
                bgcolor: darken(secondary.dark, 0.6),
                color: myWhite,
                cursor: 'default',
                opacity: 0.3,
                textAlign: 'center',
                border: `1px solid ${secondary.dark}`,
            },
            upperNavContainer: {
                bgcolor: darken(secondary.dark, 0.8),
                padding: 1,
                border: `2px solid ${secondary.dark}`,
                borderRadius: 2,
            },
        },
        theme: createTheme({
            ...fontBoost,
            palette: {
                primary: {
                    main: '#5eb1bf',
                    contrastText: 'myBlack',
                },
                secondary: {
                    main: '#72bac6',
                    contrastText: 'myBlack',
                },
                error: {
                    main: '#f44336',
                },
                warning: {
                    main: '#ffa726',
                },
                info: {
                    main: '#59595B',
                },
                success: {
                    main: '#D9782D',
                },
                text: {
                    primary: myWhite,
                },
            },
            components: {
                MuiIconButton: {
                    styleOverrides: {
                        root: {
                            color: myWhite,
                        },
                    },
                },
                MuiTextField: {
                    styleOverrides: {
                        root: {
                            color: myWhite,
                        },
                    },
                },
                MuiInputLabel: {
                    styleOverrides: {
                        root: {
                            color: myWhite,
                        },
                    },
                },
                MuiAccordionSummary: {
                    styleOverrides: {
                        root: {
                            color: primary.light,
                            backgroundColor: darken(primary.dark, 0.5),
                        },
                    },
                },
                MuiAccordionDetails: {
                    styleOverrides: {
                        root: {
                            backgroundColor: '#28373c',
                        },
                    },
                },
            },
        }),
    },
}

//  --color-primary-100:  #5eb1bf;
//  --color-primary-200:  #72bac6;
//  --color-primary-300:  #85c2cd;
//  --color-primary-400:  #98cbd4;
//  --color-primary-500:  #a9d3db;
//  --color-primary-600:  #bbdce2;
//   /** CSS DARK THEME SURFACE COLORS */
//   --color-surface-100:  #08151a;
//   --color-surface-200:  #212a2f;
//   --color-surface-300:  #384145;
//   --color-surface-400:  #51595d;
//   --color-surface-500:  #6c7276;
//   --color-surface-600:  #878d90;
//   /** CSS DARK THEME MIXED SURFACE COLORS */
//   --color-surface-mixed-100:  #122228;
//   --color-surface-mixed-200:  #28373c;
//   --color-surface-mixed-300:  #404d52;
//   --color-surface-mixed-400:  #586468;
//   --color-surface-mixed-500:  #727c80;
//   --color-surface-mixed-600:  #8d9498;
