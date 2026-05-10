import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export type SearchEngine = {
  id: string
  name: string
  url: string
  searchUrl: string
}

export const SEARCH_ENGINES: SearchEngine[] = [
  { id: 'google', name: 'GOOGLE', url: 'https://google.com', searchUrl: 'https://www.google.com/search?q=' },
  { id: 'bing', name: 'BING', url: 'https://bing.com', searchUrl: 'https://www.bing.com/search?q=' },
  { id: 'duckduckgo', name: 'DUCKDUCKGO', url: 'https://duckduckgo.com', searchUrl: 'https://duckduckgo.com/?q=' },
  { id: 'brave', name: 'BRAVE', url: 'https://search.brave.com', searchUrl: 'https://search.brave.com/search?q=' },
]

export type Bookmark = {
  id: string
  title: string
  url: string
  date: string
  groupId?: string
}

export type BookmarkGroup = {
  id: string
  name: string
}

export type Profile = {
  id: string
  name: string
  email: string
  avatarColor: string
}

interface SettingsState {
  searchEngineId: string
  setSearchEngine: (id: string) => void
  bookmarks: Bookmark[]
  bookmarkGroups: BookmarkGroup[]
  toggleBookmark: (url: string, title: string) => void
  removeBookmark: (id: string) => void
  addBookmarkGroup: (name: string) => void
  removeBookmarkGroup: (id: string) => void
  moveBookmarkToGroup: (bookmarkId: string, groupId?: string) => void
  isSidebarCollapsed: boolean
  setSidebarCollapsed: (collapsed: boolean) => void
  ramLimit: number
  setRamLimit: (limit: number) => void
  netLimit: number
  setNetLimit: (limit: number) => void
  efficiencyMode: 'BALANCED' | 'AGGRESSIVE' | 'OFF'
  setEfficiencyMode: (mode: 'BALANCED' | 'AGGRESSIVE' | 'OFF') => void
  profiles: Profile[]
  activeProfileId: string
  addProfile: (name: string, email: string) => void
  removeProfile: (id: string) => void
  setActiveProfile: (id: string) => void
  addBookmark: (url: string, title: string) => void
  language: string
  setLanguage: (lang: string) => void
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      searchEngineId: 'google',
      setSearchEngine: (id) => set({ searchEngineId: id }),
      bookmarks: [],
      bookmarkGroups: [],
      isSidebarCollapsed: false,
      setSidebarCollapsed: (collapsed) => set({ isSidebarCollapsed: collapsed }),
      toggleBookmark: (url, title) => set((state) => {
        const exists = state.bookmarks.find(b => b.url === url)
        if (exists) {
          return { bookmarks: state.bookmarks.filter(b => b.url !== url) }
        }
        const newBookmark: Bookmark = {
          id: Math.random().toString(36).substr(2, 9),
          title: title || url,
          url,
          date: new Date().toLocaleDateString(),
        }
        return { bookmarks: [...state.bookmarks, newBookmark] }
      }),
      removeBookmark: (id) => set((state) => ({
        bookmarks: state.bookmarks.filter(b => b.id !== id)
      })),
      addBookmarkGroup: (name) => set((state) => ({
        bookmarkGroups: [...state.bookmarkGroups, { id: Math.random().toString(36).substr(2, 9), name }]
      })),
      removeBookmarkGroup: (id) => set((state) => ({
        bookmarkGroups: state.bookmarkGroups.filter(g => g.id !== id),
        bookmarks: state.bookmarks.map(b => b.groupId === id ? { ...b, groupId: undefined } : b)
      })),
      moveBookmarkToGroup: (bookmarkId, groupId) => set((state) => ({
        bookmarks: state.bookmarks.map(b => b.id === bookmarkId ? { ...b, groupId } : b)
      })),
      ramLimit: 2048,
      setRamLimit: (limit) => set({ ramLimit: limit }),
      netLimit: 0,
      setNetLimit: (limit) => set({ netLimit: limit }),
      efficiencyMode: 'BALANCED',
      setEfficiencyMode: (mode) => set({ efficiencyMode: mode }),
      profiles: [{ id: 'default', name: 'Primary Core', email: 'default@kal.sys', avatarColor: '#00A6FF' }],
      activeProfileId: 'default',
      addProfile: (name, email) => set((state) => {
        const colors = ['#00A6FF', '#FF2B2B', '#FFD700', '#32CD32', '#FF69B4', '#8A2BE2']
        const randomColor = colors[Math.floor(Math.random() * colors.length)]
        return {
          profiles: [...state.profiles, { 
            id: Math.random().toString(36).substr(2, 9), 
            name, 
            email, 
            avatarColor: randomColor 
          }]
        }
      }),
      removeProfile: (id) => set((state) => {
        if (id === 'default') return state
        const newProfiles = state.profiles.filter(p => p.id !== id)
        return { 
          profiles: newProfiles,
          activeProfileId: state.activeProfileId === id ? 'default' : state.activeProfileId
        }
      }),
      setActiveProfile: (id) => set({ activeProfileId: id }),
      addBookmark: (url, title) => set((state) => {
        const id = Math.random().toString(36).substr(2, 9)
        const newBookmark: Bookmark = {
          id,
          title: title || url,
          url: url.startsWith('http') ? url : `https://${url}`,
          date: new Date().toLocaleDateString(),
        }
        return { bookmarks: [...state.bookmarks, newBookmark] }
      }),
      language: 'en',
      setLanguage: (lang) => set({ language: lang }),
    }),
    {
      name: 'kal-settings',
    }
  )
)
