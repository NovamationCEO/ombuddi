import { Button } from '@mui/material'
import { ButtonContainer } from './ButtonContainer'

export function SaveCancel(props: { onSave: () => void; onCancel: () => void; saving?: boolean }) {
    const { onSave, onCancel, saving = false } = props

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
                disabled={saving}
            >
                {saving ? 'Saving…' : 'Save'}
            </Button>
        </ButtonContainer>
    )
}
