import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { User, Session } from '@supabase/supabase-js'
import type { Profile } from '@/types'

interface AuthState {
  user: User | null
  session: Session | null
  profile: Profile | null
  isLoading: boolean
  isRevealed: boolean  // whether amounts are currently unmasked
  setUser: (user: User | null) => void
  setSession: (session: Session | null) => void
  setProfile: (profile: Profile | null) => void
  setLoading: (loading: boolean) => void
  toggleReveal: () => void
  reset: () => void
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      session: null,
      profile: null,
      isLoading: true,
      isRevealed: false,
      setUser: (user) => set({ user }),
      setSession: (session) => set({ session }),
      setProfile: (profile) => set({ profile }),
      setLoading: (isLoading) => set({ isLoading }),
      toggleReveal: () => set((s) => ({ isRevealed: !s.isRevealed })),
      reset: () => set({ user: null, session: null, profile: null, isRevealed: false }),
    }),
    {
      name: 'et-auth',
      partialize: (state) => ({ profile: state.profile }),
    }
  )
)
