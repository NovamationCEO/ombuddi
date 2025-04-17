import { RollerShades } from '@mui/icons-material'
import { RoundButton } from '../trusted-components/RoundButton'
import { useUpperBar } from '../libraries/useUpperBar'

export function UpperBarButton() {
    const changePosition = useUpperBar((state) => state.changePosition)

    return (
        <RoundButton onClick={changePosition}>
            <RollerShades />
        </RoundButton>
    )
}
