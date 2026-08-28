import { describe, expect, it } from 'vitest'
import { getContrastRatio, type CssVarsTheme } from '@mui/material/styles'
import { appTheme, colorSchemeStorageKey } from './appTheme'

const cssVarsTheme = appTheme as unknown as CssVarsTheme

describe('appTheme', () => {
    it('uses the current institutional palette as the default dark scheme', () => {
        expect(cssVarsTheme.defaultColorScheme).toBe('dark')
        expect(cssVarsTheme.colorSchemes.dark?.palette.background.default).toBe('#10272B')
        expect(cssVarsTheme.colorSchemes.dark?.palette.app.backgroundDeep).toBe('#0B1D20')
        expect(cssVarsTheme.colorSchemes.dark?.palette.background.paper).toBe('#193438')
        expect(cssVarsTheme.colorSchemes.dark?.palette.text.primary).toBe('#F3F2EC')
        expect(cssVarsTheme.colorSchemes.dark?.palette.primary.main).toBe('#9A6CAE')
    })

    it('provides a complete light scheme from the same semantic token structure', () => {
        const light = cssVarsTheme.colorSchemes.light?.palette
        const dark = cssVarsTheme.colorSchemes.dark?.palette

        expect(light?.background.default).toBe('#F2F6F5')
        expect(light?.background.paper).toBe('#FFFFFF')
        expect(light?.app).toEqual(expect.objectContaining(Object.fromEntries(Object.keys(dark?.app ?? {}).map((key) => [key, expect.any(String)]))))
    })

    it('uses one stable persistence key for color-scheme selection', () => {
        expect(colorSchemeStorageKey).toBe('ombuddi-color-scheme')
    })

    it('keeps the dark scheme readable on its primary signed-in surfaces', () => {
        const dark = cssVarsTheme.colorSchemes.dark?.palette

        expect(getContrastRatio(dark!.text.primary, dark!.background.default)).toBeGreaterThanOrEqual(7)
        expect(getContrastRatio(dark!.text.primary, dark!.background.paper)).toBeGreaterThanOrEqual(7)
        expect(getContrastRatio(dark!.text.secondary, dark!.background.paper)).toBeGreaterThanOrEqual(4.5)
        expect(getContrastRatio(dark!.primary.contrastText, dark!.primary.dark)).toBeGreaterThanOrEqual(4.5)
        expect(getContrastRatio(dark!.secondary.contrastText, dark!.secondary.main)).toBeGreaterThanOrEqual(4.5)
    })
})
