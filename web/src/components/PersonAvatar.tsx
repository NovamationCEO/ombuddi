import { Avatar } from '@mui/material'
import { useCurrentOmbuds } from '../tools/useCurrentOmbuds'
import { PersonGeometricPortrait } from './PersonGeometricPortrait'
import { PersonMonster } from './PersonMonsterPortrait'

export type PersonAvatarStyle = 'monster' | 'geometric'

export function PersonAvatar({
    seed,
    version,
    size = 32,
    style,
}: {
    seed: string
    version?: number
    size?: number
    style?: PersonAvatarStyle
}) {
    const currentOmbuds = useCurrentOmbuds(style === undefined)
    // While a preference is loading, neutral geometry is the respectful
    // fallback. The persisted account default remains the monster style.
    const selectedStyle =
        style ?? currentOmbuds.data?.personAvatarStyle ?? (currentOmbuds.isLoading ? 'geometric' : 'monster')

    return (
        <Avatar
            aria-hidden="true"
            data-person-avatar-style={selectedStyle}
            sx={{ width: size, height: size, bgcolor: 'transparent' }}
        >
            {selectedStyle === 'geometric' ? (
                <PersonGeometricPortrait
                    seed={seed}
                    version={version}
                />
            ) : (
                <PersonMonster
                    seed={seed}
                    version={version}
                />
            )}
        </Avatar>
    )
}
