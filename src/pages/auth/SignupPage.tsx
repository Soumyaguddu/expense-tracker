import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { motion } from 'framer-motion'
import { Mail, Lock, User, Zap, AlertCircle, CheckCircle } from 'lucide-react'
import { Button, Input } from '@/components/ui'
import { authService } from '@/services/authService'

interface SignupForm {
  fullName: string
  email: string
  password: string
  confirmPassword: string
}

export function SignupPage() {
  const navigate = useNavigate()
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const { register, handleSubmit, watch, formState: { errors, isSubmitting } } = useForm<SignupForm>()

  async function onSubmit(data: SignupForm) {
    try {
      setError('')
      await authService.signUp(data.email, data.password, data.fullName)
      setSuccess(true)
    } catch (err: any) {
      setError(err.message ?? 'Sign up failed.')
    }
  }

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <motion.div
          className="w-full max-w-sm glass-card p-8 text-center space-y-4"
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
        >
          <div className="w-16 h-16 rounded-2xl bg-green-500/10 flex items-center justify-center mx-auto">
            <CheckCircle className="w-8 h-8 text-green-400" />
          </div>
          <h2 className="text-xl font-bold text-surface-50">Check your email</h2>
          <p className="text-surface-500 text-sm">
            We've sent a verification link to your email. Click it to activate your account.
          </p>
          <Link to="/auth/login">
            <Button variant="secondary" className="w-full mt-2">Back to Sign In</Button>
          </Link>
        </motion.div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <motion.div
        className="w-full max-w-sm"
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
      >
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
            <h1 className="text-xl font-bold text-surface-50">Create account</h1>
            <p className="text-sm text-surface-500 mt-1">Track every rupee with encryption</p>
          </div>

          {error && (
            <div className="flex items-center gap-2 p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-sm">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <Input
              label="Full Name"
              placeholder="Soumyajit Sen"
              leftIcon={<User className="w-4 h-4" />}
              error={errors.fullName?.message}
              {...register('fullName', { required: 'Name is required' })}
            />
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
              placeholder="Min 8 characters"
              leftIcon={<Lock className="w-4 h-4" />}
              error={errors.password?.message}
              {...register('password', {
                required: 'Password is required',
                minLength: { value: 8, message: 'Minimum 8 characters' },
              })}
            />
            <Input
              label="Confirm Password"
              type="password"
              placeholder="Repeat password"
              leftIcon={<Lock className="w-4 h-4" />}
              error={errors.confirmPassword?.message}
              {...register('confirmPassword', {
                required: 'Please confirm password',
                validate: v => v === watch('password') || 'Passwords do not match',
              })}
            />

            <Button type="submit" className="w-full" loading={isSubmitting}>
              Create Account
            </Button>
          </form>

          <p className="text-sm text-surface-500 text-center">
            Already have an account?{' '}
            <Link to="/auth/login" className="text-brand-400 hover:text-brand-300 font-medium transition-colors">
              Sign in
            </Link>
          </p>
        </div>
      </motion.div>
    </div>
  )
}
