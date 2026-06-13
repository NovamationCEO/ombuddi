import { create } from 'zustand'

type SessionSaltStore = {
    /** null = not yet prompted. '' = explicitly blank. Any other string = the phrase. */
    sessionSalt: string | null
    setSessionSalt: (salt: string) => void
}

export const useSessionSalt = create<SessionSaltStore>((set) => ({
    sessionSalt: null,
    setSessionSalt: (salt) => set({ sessionSalt: salt }),
}))
