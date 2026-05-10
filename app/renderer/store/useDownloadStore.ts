import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export type Download = {
  id: string
  name: string
  progress: number
  size: string
  date: string
  status: 'active' | 'completed' | 'failed'
  path?: string
}

interface DownloadState {
  downloads: Download[]
  addDownload: (download: Download) => void
  updateDownload: (id: string, updates: Partial<Download>) => void
  removeDownload: (id: string) => void
  clearCompleted: () => void
}

export const useDownloadStore = create<DownloadState>()(
  persist(
    (set) => ({
      downloads: [],
      addDownload: (d) => set((state) => ({
        downloads: [d, ...state.downloads]
      })),
      updateDownload: (id, updates) => set((state) => ({
        downloads: state.downloads.map(d => d.id === id ? { ...d, ...updates } : d)
      })),
      removeDownload: (id) => set((state) => ({
        downloads: state.downloads.filter(d => d.id !== id)
      })),
      clearCompleted: () => set((state) => ({
        downloads: state.downloads.filter(d => d.status !== 'completed')
      })),
    }),
    {
      name: 'kal-downloads',
    }
  )
)
