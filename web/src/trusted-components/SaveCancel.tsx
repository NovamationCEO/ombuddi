import { Button } from '@mui/material'
import { ButtonContainer } from './ButtonContainer'

export function SaveCancel(props: { onSave: () => void; onCancel: () => void }) {
    const { onSave, onCancel } = props

    return (
        <ButtonContainer>
            <Button
                variant={'outlined'}
                onClick={onCancel}
            >
                Cancel
            </Button>
            <Button
                variant={'contained'}
                onClick={onSave}
            >
                Save
            </Button>
        </ButtonContainer>
    )
}
