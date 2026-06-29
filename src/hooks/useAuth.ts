import { useEffect } from 'react'
import { useAuthStore } from '@/store/authStore'
import { authService } from '@/services/authService'
import { supabase } from '@/lib/supabase'

export function useAuth() {
  const { user, session, profile, isLoading, setUser, setSession, setProfile, setLoading, reset } = useAuthStore()

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      setUser(session?.user ?? null)
      if (session?.user) {
        authService.getProfile(session.user.id)
          .then(setProfile)
          .catch(() => {})
      }
      setLoading(false)
    })

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      setSession(session)
      setUser(session?.user ?? null)

      if (event === 'SIGNED_IN' && session?.user) {
        try {
          const profile = await authService.getProfile(session.user.id)
          setProfile(profile)
        } catch {
          // Profile might not exist yet, trigger will create it
        }
      }

      if (event === 'SIGNED_OUT') {
        reset()
      }

      setLoading(false)
    })

    return () => subscription.unsubscribe()
  }, [])

  return { user, session, profile, isLoading }
}
