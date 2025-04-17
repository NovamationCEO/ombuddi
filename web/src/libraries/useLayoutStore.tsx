import { create } from 'zustand'

interface LayoutStoreType {
    themeName: string
    setThemeName: (themeName: string) => void
    sidebarLeftOpen: boolean
    setSidebarLeftOpen: (b: boolean) => void
    sidebarRightOpen: boolean
    setSidebarRightOpen: (b: boolean) => void
    sidebarBottomOpen: boolean
    setSidebarBottomOpen: (b: boolean) => void
    mapPriority: boolean
    setMapPriority: (b: boolean) => void
}

export const useLayoutStore = create<LayoutStoreType>((set) => {
    return {
        themeName: 'light',
        setThemeName: (themeName: string) => {
            set({ themeName })
        },
        sidebarLeftOpen: true,
        setSidebarLeftOpen: (sidebarOpen: boolean) => {
            set({ sidebarLeftOpen: sidebarOpen })
        },
        sidebarRightOpen: false,
        setSidebarRightOpen: (sidebarOpen: boolean) => {
            set({ sidebarRightOpen: sidebarOpen })
        },
        sidebarBottomOpen: false,
        setSidebarBottomOpen: (sidebarOpen: boolean) => {
            set({ sidebarBottomOpen: sidebarOpen })
        },
        mapPriority: true,
        setMapPriority: (b: boolean) => {
            set({ mapPriority: b })
        },
    }
})
