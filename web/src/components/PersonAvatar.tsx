import { Avatar } from '@mui/material'
import { useCurrentOmbuds } from '../tools/useCurrentOmbuds'
import type { PersonType } from '../types/majorTypes'
import { PersonGeometricPortrait } from './PersonGeometricPortrait'
import { PersonMonster } from './PersonMonsterPortrait'
import { PERSON_MONSTER_VERSION } from './personMonsterProfile'

export type PersonAvatarStyle = 'monster' | 'geometric'

export function PersonAvatar({
    person,
    size = 32,
    style,
}: {
    person: Pick<PersonType, 'monsterSeed' | 'monsterVersion'>
    size?: number
    style?: PersonAvatarStyle
}) {
    const currentOmbuds = useCurrentOmbuds(style === undefined)
    const selectedStyle = style ?? currentOmbuds.data?.personAvatarStyle ?? 'monster'

    if (style === undefined && currentOmbuds.isLoading) {
        return (
            <Avatar
                aria-hidden="true"
                data-person-avatar-style="loading"
                sx={{ width: size, height: size, bgcolor: 'action.hover' }}
            />
        )
    }

    if (selectedStyle === 'monster' && person.monsterVersion !== PERSON_MONSTER_VERSION) {
        return (
            <Avatar
                aria-hidden="true"
                data-person-avatar-style="unsupported"
                sx={{ width: size, height: size, bgcolor: 'action.hover', color: 'text.disabled' }}
            >
                ?
            </Avatar>
        )
    }

    return (
        <Avatar
            aria-hidden="true"
            data-person-avatar-style={selectedStyle}
            sx={{ width: size, height: size, bgcolor: 'transparent' }}
        >
            {selectedStyle === 'geometric' ? (
                <PersonGeometricPortrait
                    seed={person.monsterSeed}
                />
            ) : (
                <PersonMonster
                    seed={person.monsterSeed}
                    version={person.monsterVersion}
                />
            )}
        </Avatar>
    )
}
