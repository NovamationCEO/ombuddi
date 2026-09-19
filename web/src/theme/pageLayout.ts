// Shared page geometry, based on Reports. Dialogs and content controls retain
// their own sizing; route-level content fills the available workspace.
export const pagePadding = { xs: 2, sm: 3, lg: 4 } as const
export const pageTitleStyle = { color: 'text.primary', fontWeight: 700 } as const
export const pageLayoutStyle = {
    width: '100%',
    minWidth: 0,
    minHeight: '100%',
    boxSizing: 'border-box',
    bgcolor: 'background.default',
    color: 'text.primary',
    p: pagePadding,
} as const
