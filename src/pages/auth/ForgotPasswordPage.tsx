import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { motion } from 'framer-motion'
import { Mail, Zap, AlertCircle, CheckCircle, ArrowLeft } from 'lucide-react'
import { Button, Input } from '@/components/ui'
import { authService } from '@/services/authService'

export function ForgotPasswordPage() {
  const [error, setError] = useState('')
  const [sent, setSent] = useState(false)
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<{ email: string }>()

  async function onSubmit({ email }: { email: string }) {
    try {
      setError('')
      await authService.resetPassword(email)
      setSent(true)
    } catch (err: any) {
      setError(err.message ?? 'Failed to send reset email.')
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <motion.div
        className="w-full max-w-sm"
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <Link to="/auth/login" className="inline-flex items-center gap-2 text-sm text-surface-500 hover:text-surface-200 mb-8 transition-colors">
          <ArrowLeft className="w-4 h-4" /> Back to sign in
        </Link>

        <div className="glass-card p-6 space-y-5">
          {sent ? (
            <div className="text-center space-y-4 py-4">
              <div className="w-14 h-14 rounded-2xl bg-green-500/10 flex items-center justify-center mx-auto">
                <CheckCircle className="w-7 h-7 text-green-400" />
              </div>
              <div>
                <h2 className="font-bold text-surface-50">Reset email sent</h2>
                <p className="text-sm text-surface-500 mt-1">Check your inbox for the password reset link.</p>
              </div>
            </div>
          ) : (
            <>
              <div>
                <h1 className="text-xl font-bold text-surface-50">Forgot password?</h1>
                <p className="text-sm text-surface-500 mt-1">We'll send you a reset link.</p>
              </div>

              {error && (
                <div className="flex items-center gap-2 p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-sm">
                  <AlertCircle className="w-4 h-4" />
                  {error}
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
                <Button type="submit" className="w-full" loading={isSubmitting}>
                  Send Reset Link
                </Button>
              </form>
            </>
          )}
        </div>
      </motion.div>
    </div>
  )
}
