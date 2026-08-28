import { create } from 'zustand'

type SessionSaltStore = {
    /** null = not set for this browser session. Any string is the current phrase. */
    sessionSalt: string | null
    setSessionSalt: (salt: string) => void
    clearSessionSalt: () => void
}

export const useSessionSalt = create<SessionSaltStore>((set) => ({
    sessionSalt: null,
    setSessionSalt: (salt) => set({ sessionSalt: salt }),
    clearSessionSalt: () => set({ sessionSalt: null }),
}))
