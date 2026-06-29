import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { motion } from 'framer-motion'
import { Mail, Lock, Zap, AlertCircle, Info } from 'lucide-react'
import { Button, Input } from '@/components/ui'
import { authService } from '@/services/authService'
import { supabase } from '@/lib/supabase'

interface LoginForm {
  email: string
  password: string
}

export function LoginPage() {
  const navigate = useNavigate()
  const [error, setError] = useState('')
  const [hint, setHint] = useState('')
  const { register, handleSubmit, watch, formState: { errors, isSubmitting } } = useForm<LoginForm>()

  async function onSubmit(data: LoginForm) {
    try {
      setError('')
      setHint('')

      // Direct supabase call so we can inspect the full error
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email: data.email.trim().toLowerCase(),
        password: data.password,
      })

      console.log('Auth response:', { authData, authError })

      if (authError) {
        // Give actionable hints based on error message
        if (authError.message.includes('Invalid login credentials')) {
          setError('Invalid email or password.')
          setHint('Make sure your email is verified — check your inbox for a confirmation email, or use "Forgot password" to reset.')
        } else if (authError.message.includes('Email not confirmed')) {
          setError('Email not confirmed.')
          setHint('Check your inbox and click the confirmation link Supabase sent when you signed up.')
        } else {
          setError(authError.message)
        }
        return
      }

      if (authData.user) {
        navigate('/dashboard')
      }
    } catch (err: any) {
      setError(err.message ?? 'Sign in failed.')
    }
  }

  // Quick test: check if user exists at all
  async function handleDebugCheck() {
    const email = watch('email')
    if (!email) return
    const { data, error } = await supabase.auth.resetPasswordForEmail(email.trim().toLowerCase())
    console.log('Password reset check:', { data, error })
    setHint(error ? `Error: ${error.message}` : '✅ Password reset email sent — this confirms your account exists. Check inbox.')
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <motion.div
        className="w-full max-w-sm"
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
      >
        {/* Logo */}
        <div className="flex items-center gap-3 mb-8">
          <div className="w-10 h-10 rounded-xl bg-brand-500/20 flex items-center justify-center">
            <Zap className="w-5 h-5 text-brand-400" />
          </div>
          <div>
            <p className="font-bold text-xl text-surface-50">Trackr</p>
            <p className="text-xs text-surface-500">Expense Manager</p>
          </div>
        </div>

        <div className="glass-card p-6 space-y-5">
          <div>
            <h1 className="text-xl font-bold text-surface-50">Welcome back</h1>
            <p className="text-sm text-surface-500 mt-1">Sign in to your account</p>
          </div>

          {error && (
            <div className="flex items-start gap-2 p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-sm">
              <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <div>
                <p>{error}</p>
                {hint && <p className="text-xs mt-1 text-rose-300/80">{hint}</p>}
              </div>
            </div>
          )}

          {!error && hint && (
            <div className="flex items-start gap-2 p-3 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-400 text-sm">
              <Info className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <p className="text-xs">{hint}</p>
            </div>
          )}

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <Input
              label="Email"
              type="email"
              placeholder="you@example.com"
              leftIcon={<Mail className="w-4 h-4" />}
              error={errors.email?.message}
              {...register('email', { required: 'Email is required' })}
            />
            <Input
              label="Password"
              type="password"
              placeholder="••••••••"
              leftIcon={<Lock className="w-4 h-4" />}
              error={errors.password?.message}
              {...register('password', { required: 'Password is required' })}
            />

            <div className="flex justify-end">
              <Link to="/auth/forgot-password" className="text-xs text-brand-400 hover:text-brand-300 transition-colors">
                Forgot password?
              </Link>
            </div>

            <Button type="submit" className="w-full" loading={isSubmitting}>
              Sign In
            </Button>
          </form>

          <p className="text-sm text-surface-500 text-center">
            No account?{' '}
            <Link to="/auth/signup" className="text-brand-400 hover:text-brand-300 font-medium transition-colors">
              Sign up free
            </Link>
          </p>
        </div>

        <p className="text-xs text-center text-surface-600 mt-6">
          Your financial data is encrypted end-to-end 🔒
        </p>
      </motion.div>
    </div>
  )
}
