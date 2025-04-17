import { useLayoutStore } from '../libraries/useLayoutStore'
import { themes } from '../theme/themes'

export function useStyles() {
    const themeName = useLayoutStore((state) => state.themeName)
    const set = themes[themeName as keyof typeof themes].styles || themes.light.styles
    return set
}
