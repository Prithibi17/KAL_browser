import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export type PermissionState = 'allow' | 'deny' | 'ask'

export interface WebsitePermissions {
  microphone?: PermissionState
  camera?: PermissionState
  location?: PermissionState
  notifications?: PermissionState
  midi?: PermissionState
  clipboard?: PermissionState
  fullscreen?: PermissionState
  pointerLock?: PermissionState
}

interface PermissionStore {
  permissions: Record<string, WebsitePermissions> // key is origin (e.g., https://google.com)
  setPermission: (origin: string, permission: keyof WebsitePermissions, state: PermissionState) => void
  getPermission: (origin: string, permission: keyof WebsitePermissions) => PermissionState
  resetOrigin: (origin: string) => void
}

export const usePermissionStore = create<PermissionStore>()(
  persist(
    (set, get) => ({
      permissions: {},
      setPermission: (origin, permission, state) => set((s) => ({
        permissions: {
          ...s.permissions,
          [origin]: {
            ...s.permissions[origin],
            [permission]: state
          }
        }
      })),
      getPermission: (origin, permission) => {
        const originPerms = get().permissions[origin]
        return (originPerms && originPerms[permission]) || 'ask'
      },
      resetOrigin: (origin) => set((s) => {
        const newPerms = { ...s.permissions }
        delete newPerms[origin]
        return { permissions: newPerms }
      })
    }),
    {
      name: 'kal-permissions-storage',
    }
  )
)
