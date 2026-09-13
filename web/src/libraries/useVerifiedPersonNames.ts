import { create } from 'zustand'

type VerifiedPersonNamesStore = {
    /** Names verified during this browser session, keyed by person UUID. */
    names: Record<string, string>
    setVerifiedName: (personId: string, name: string) => void
    clearVerifiedNames: () => void
}

export const useVerifiedPersonNames = create<VerifiedPersonNamesStore>((set) => ({
    names: {},
    setVerifiedName: (personId, name) =>
        set((state) => ({ names: { ...state.names, [personId]: name } })),
    clearVerifiedNames: () => set({ names: {} }),
}))
