import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { motion } from 'framer-motion'
import { User, Globe, Shield, LogOut, Save } from 'lucide-react'
import { Button, Input, Card } from '@/components/ui'
import { useAuthStore } from '@/store/authStore'
import { authService } from '@/services/authService'
import { useNavigate } from 'react-router-dom'
import { CURRENCIES } from '@/utils/helpers'

export function SettingsPage() {
  const { user, profile, setProfile } = useAuthStore()
  const navigate = useNavigate()
  const [saved, setSaved] = useState(false)

  const { register, handleSubmit, formState: { isSubmitting } } = useForm({
    defaultValues: {
      full_name: profile?.full_name ?? '',
      currency: profile?.currency ?? 'INR',
    },
  })

  async function onSubmit(data: { full_name: string; currency: string }) {
    await authService.updateProfile(user!.id, data)
    setProfile({ ...profile!, ...data })
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  async function handleSignOut() {
    await authService.signOut()
    navigate('/auth/login')
  }

  return (
    <div className="p-6 space-y-6 max-w-2xl animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold text-surface-50">Settings</h1>
        <p className="text-sm text-surface-500 mt-0.5">Manage your account preferences</p>
      </div>

      {/* Profile */}
      <Card className="p-5">
        <div className="flex items-center gap-3 mb-5">
          <User className="w-4 h-4 text-brand-400" />
          <h2 className="font-semibold text-surface-200">Profile</h2>
        </div>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <Input label="Email" value={user?.email ?? ''} readOnly className="opacity-60 cursor-default" />
          <Input label="Display Name" {...register('full_name')} />
          <div className="space-y-1.5">
            <label className="label">Currency</label>
            <select className="input" {...register('currency')}>
              {CURRENCIES.map(c => (
                <option key={c.code} value={c.code}>{c.symbol} {c.name} ({c.code})</option>
              ))}
            </select>
          </div>
          <Button type="submit" loading={isSubmitting}>
            <Save className="w-4 h-4" />
            {saved ? 'Saved!' : 'Save Changes'}
          </Button>
        </form>
      </Card>

      {/* Security */}
      <Card className="p-5">
        <div className="flex items-center gap-3 mb-5">
          <Shield className="w-4 h-4 text-brand-400" />
          <h2 className="font-semibold text-surface-200">Security</h2>
        </div>
        <div className="space-y-3">
          <div className="flex items-center justify-between py-3 border-b border-white/8">
            <div>
              <p className="text-sm text-surface-200">Password</p>
              <p className="text-xs text-surface-500">Change your login password</p>
            </div>
            <Button variant="secondary" size="sm">Change</Button>
          </div>
          <div className="flex items-center justify-between py-3">
            <div>
              <p className="text-sm text-surface-200">Amount Encryption</p>
              <p className="text-xs text-surface-500">All amounts encrypted with AES-256-GCM</p>
            </div>
            <span className="text-xs text-green-400 font-medium bg-green-500/10 px-2 py-1 rounded-lg border border-green-500/20">
              ✓ Active
            </span>
          </div>
        </div>
      </Card>

      {/* Danger zone */}
      <Card className="p-5 border-rose-500/20">
        <h2 className="font-semibold text-rose-400 mb-4">Sign Out</h2>
        <p className="text-sm text-surface-500 mb-4">
          You'll be signed out of this device. Your data remains safe in the cloud.
        </p>
        <Button variant="danger" onClick={handleSignOut}>
          <LogOut className="w-4 h-4" /> Sign Out
        </Button>
      </Card>
    </div>
  )
}
