export function upperBar() {}
import { create } from 'zustand'
import { sidebarTopHeight } from '../constants/uiSizes'
import React from 'react'

type UpperBarType = {
    position: number
    setPosition: (n: number) => void
    changePosition: () => void
    content: React.ReactNode
    setContent: (rn: React.ReactNode) => void
}

type Actions = {
    changePosition: () => void
}

export const useUpperBar = create<UpperBarType & Actions>((set, get) => {
    return {
        position: 0,
        setPosition: (position: number) => {
            set({ position })
        },
        changePosition: () => {
            const pos = get().position
            set({ position: (pos + 1) % sidebarTopHeight.length })
        },
        content: null,
        setContent: (rn: React.ReactNode) => {
            set({ content: rn })
        },
    }
})
