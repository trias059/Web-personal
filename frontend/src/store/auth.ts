import { create } from 'zustand'
import { persist } from 'zustand/middleware'

import { queryClient } from '../lib/queryClient'
import type { Session, SessionUser } from '../lib/types'

interface AuthState {
  token: string | null
  user: SessionUser | null
  setSession: (session: Session) => void
  setUser: (user: SessionUser) => void
  logout: () => void
}

// Cache query dikosongkan setiap ganti sesi supaya data yang hanya boleh dilihat
// satu role tidak tampil ke pengguna berikutnya di perangkat yang sama.
export const useAuth = create<AuthState>()(
  persist(
    (set) => ({
      token: null,
      user: null,
      setSession: ({ token, user }) => {
        queryClient.clear()
        set({ token, user })
      },
      setUser: (user) => set({ user }),
      logout: () => {
        queryClient.clear()
        set({ token: null, user: null })
      },
    }),
    { name: 'rumah-digital-auth', partialize: ({ token, user }) => ({ token, user }) },
  ),
)

export const useIsOwner = () => useAuth((s) => s.user?.role === 'super_admin')
