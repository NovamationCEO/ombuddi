import { create } from 'zustand'
import { SnackType } from '../trusted-components/Snack'

type SnackStoreType = {
    snack: SnackType
    setSnack: (snack: SnackType) => void
}

export const useSnack = create<SnackStoreType>((set) => {
    return {
        snack: { message: '', severity: 'info' },
        setSnack: (snack: SnackType) => {
            set({ snack })
        },
    }
})
