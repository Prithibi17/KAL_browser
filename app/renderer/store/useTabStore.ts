import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export interface Tab {
  id: string
  title: string
  url: string
  favicon?: string
  isPinned?: boolean
  loading?: boolean
  profileId?: string
  canGoBack?: boolean
  canGoForward?: boolean
}

interface TabState {
  tabs: Tab[]
  activeTabId: string | null
  addTab: (tab: Tab) => void
  removeTab: (id: string) => void
  setActiveTab: (id: string | null) => void
  updateTab: (id: string, updates: Partial<Tab>) => void
  clearTabs: () => void
}

export const useTabStore = create<TabState>()(
  persist(
    (set) => ({
      tabs: [],
      activeTabId: null,
      addTab: (tab) => set((state) => ({ 
        tabs: [...state.tabs, tab],
        activeTabId: tab.id 
      })),
      removeTab: (id) => set((state) => {
        const newTabs = state.tabs.filter((t) => t.id !== id)
        let newActiveId = state.activeTabId
        if (state.activeTabId === id) {
          newActiveId = newTabs.length > 0 ? newTabs[newTabs.length - 1].id : null
        }
        return { tabs: newTabs, activeTabId: newActiveId }
      }),
      setActiveTab: (id) => set({ activeTabId: id }),
      updateTab: (id, updates) => set((state) => ({
        tabs: state.tabs.map(tab => tab.id === id ? { ...tab, ...updates } : tab)
      })),
      clearTabs: () => set({ tabs: [], activeTabId: null })
    }),
    {
      name: 'kal-tabs-storage',
    }
  )
)
