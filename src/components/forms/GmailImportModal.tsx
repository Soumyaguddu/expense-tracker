import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Mail, RefreshCw, CheckCircle, XCircle, ArrowRight,
  Download, AlertCircle, TrendingUp, TrendingDown, Loader2, ExternalLink
} from 'lucide-react'
import { Modal, Button, Input } from '@/components/ui'
import {
  fetchGmailTransactions, getGmailToken, storeGmailToken,
  clearGmailToken, getGmailAuthUrl, type ParsedTransaction
} from '@/services/gmailService'
import { useCreateTransaction } from '@/hooks/useTransactions'
import { useCategories } from '@/hooks/useCategories'
import { cn } from '@/utils/helpers'
import { format } from 'date-fns'

type Step = 'enter-email' | 'connecting' | 'review' | 'done'

interface Props {
  open: boolean
  onClose: () => void
}

export function GmailImportModal({ open, onClose }: Props) {
  const [step, setStep] = useState<Step>('enter-email')
  const [email, setEmail] = useState('')
  const [emailError, setEmailError] = useState('')
  const [transactions, setTransactions] = useState<ParsedTransaction[]>([])
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [importing, setImporting] = useState(false)
  const [importedCount, setImportedCount] = useState(0)
  const [error, setError] = useState('')
  const [fetching, setFetching] = useState(false)

  const createTransaction = useCreateTransaction()
  const { data: categories } = useCategories()

  // Check if returning from OAuth popup
  useEffect(() => {
    const token = getGmailToken()
    if (token && open && step === 'connecting') {
      loadTransactions(token)
    }
  }, [open, step])

  // Listen for OAuth callback from popup window
  useEffect(() => {
    function handleMessage(e: MessageEvent) {
      if (e.data?.type === 'gmail_token' && e.data.token) {
        storeGmailToken(e.data.token)
        setStep('connecting')
        loadTransactions(e.data.token)
      }
    }
    window.addEventListener('message', handleMessage)
    return () => window.removeEventListener('message', handleMessage)
  }, [])

  async function handleConnectGmail() {
    if (!email || !email.includes('@')) {
      setEmailError('Enter a valid email address')
      return
    }
    setEmailError('')
    setError('')

    // Check if we already have a token
    const existingToken = getGmailToken()
    if (existingToken) {
      setStep('connecting')
      await loadTransactions(existingToken)
      return
    }

    // Open OAuth popup
    const authUrl = getGmailAuthUrl(email)
    const popup = window.open(authUrl, 'gmail-auth', 'width=500,height=600,scrollbars=yes')

    if (!popup) {
      // Popup blocked — redirect instead
      sessionStorage.setItem('gmail_email', email)
      window.location.href = authUrl
      return
    }

    setStep('connecting')

    // Poll for popup close and check for token in URL hash
    const timer = setInterval(() => {
      try {
        if (popup.closed) {
          clearInterval(timer)
          const token = getGmailToken()
          if (!token) {
            setStep('enter-email')
            setError('Gmail connection was cancelled.')
          }
          return
        }

        // Try to read the token from popup URL hash
        const hash = popup.location.hash
        if (hash && hash.includes('access_token')) {
          const params = new URLSearchParams(hash.replace('#', ''))
          const token = params.get('access_token')
          if (token) {
            popup.close()
            clearInterval(timer)
            storeGmailToken(token)
            loadTransactions(token)
          }
        }
      } catch {
        // Cross-origin, popup still on Google — keep waiting
      }
    }, 500)
  }

  async function loadTransactions(token: string) {
    setFetching(true)
    setError('')
    try {
      const parsed = await fetchGmailTransactions(token, 50)
      setTransactions(parsed)
      setSelected(new Set(parsed.map(t => t.id)))
      setStep('review')
    } catch (err: any) {
      setError(err.message ?? 'Failed to fetch emails.')
      clearGmailToken()
      setStep('enter-email')
    } finally {
      setFetching(false)
    }
  }

  async function handleImport() {
    setImporting(true)
    const toImport = transactions.filter(t => selected.has(t.id))
    let count = 0

    // Find a default category
    const miscCat = categories?.find(c => c.name === 'Miscellaneous')
    const salaryCat = categories?.find(c => c.name === 'Salary')

    for (const txn of toImport) {
      try {
        await createTransaction.mutateAsync({
          type: txn.type,
          amount: txn.amount,
          merchant: txn.merchant,
          description: txn.description,
          transaction_date: txn.date,
          category_id: txn.type === 'income'
            ? (salaryCat?.id ?? miscCat?.id ?? '')
            : (miscCat?.id ?? ''),
        })
        count++
      } catch {
        // skip duplicates silently
      }
    }

    setImportedCount(count)
    setStep('done')
    setImporting(false)
  }

  function handleClose() {
    setStep('enter-email')
    setEmail('')
    setError('')
    setEmailError('')
    setTransactions([])
    setSelected(new Set())
    setImportedCount(0)
    onClose()
  }

  function toggleAll() {
    if (selected.size === transactions.length) {
      setSelected(new Set())
    } else {
      setSelected(new Set(transactions.map(t => t.id)))
    }
  }

  return (
    <Modal open={open} onClose={handleClose} title="Import from Gmail" size="lg">
      <AnimatePresence mode="wait">

        {/* ── Step 1: Enter Email ── */}
        {step === 'enter-email' && (
          <motion.div
            key="enter-email"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="space-y-5"
          >
            <div className="flex items-start gap-3 p-4 rounded-xl bg-blue-500/8 border border-blue-500/15">
              <Mail className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" />
              <div className="text-sm">
                <p className="font-medium text-blue-300">How it works</p>
                <p className="text-blue-400/70 mt-1 text-xs leading-relaxed">
                  We connect to your Gmail with read-only access, scan for bank transaction
                  emails (UPI, IMPS, NEFT, debit/credit alerts), and extract the amounts.
                  We never store your emails.
                </p>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="label">Gmail Address</label>
              <div className="flex gap-2">
                <input
                  type="email"
                  className={cn('input flex-1', emailError && 'border-rose-500/50')}
                  placeholder="yourname@gmail.com"
                  value={email}
                  onChange={e => { setEmail(e.target.value); setEmailError('') }}
                  onKeyDown={e => e.key === 'Enter' && handleConnectGmail()}
                />
              </div>
              {emailError && <p className="text-xs text-rose-400">{emailError}</p>}
            </div>

            {error && (
              <div className="flex items-center gap-2 p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                {error}
              </div>
            )}

            <Button className="w-full" onClick={handleConnectGmail}>
              <Mail className="w-4 h-4" />
              Connect Gmail & Fetch Transactions
              <ArrowRight className="w-4 h-4 ml-auto" />
            </Button>

            <p className="text-xs text-center text-surface-600">
              🔒 Read-only access · We never send emails on your behalf
            </p>
          </motion.div>
        )}

        {/* ── Step 2: Connecting / Fetching ── */}
        {step === 'connecting' && (
          <motion.div
            key="connecting"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="py-12 flex flex-col items-center gap-4"
          >
            <div className="w-16 h-16 rounded-2xl bg-brand-500/10 flex items-center justify-center">
              <Loader2 className="w-8 h-8 text-brand-400 animate-spin" />
            </div>
            <div className="text-center">
              <p className="font-semibold text-surface-200">
                {fetching ? 'Scanning your emails…' : 'Waiting for Gmail authorization…'}
              </p>
              <p className="text-sm text-surface-500 mt-1">
                {fetching ? 'Parsing transaction emails from the last 30 days' : 'Complete sign-in in the popup window'}
              </p>
            </div>
          </motion.div>
        )}

        {/* ── Step 3: Review ── */}
        {step === 'review' && (
          <motion.div
            key="review"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="space-y-4"
          >
            {transactions.length === 0 ? (
              <div className="py-10 text-center space-y-3">
                <div className="w-14 h-14 rounded-2xl bg-surface-800 flex items-center justify-center mx-auto">
                  <Mail className="w-7 h-7 text-surface-500" />
                </div>
                <p className="font-medium text-surface-300">No transactions found</p>
                <p className="text-sm text-surface-500">
                  No bank/payment transaction emails found in the last 30 days.
                </p>
                <Button variant="secondary" onClick={() => { clearGmailToken(); setStep('enter-email') }}>
                  Try another account
                </Button>
              </div>
            ) : (
              <>
                {/* Summary bar */}
                <div className="flex items-center justify-between">
                  <p className="text-sm text-surface-400">
                    Found <span className="text-surface-100 font-semibold">{transactions.length}</span> transactions
                    · <span className="text-brand-400 font-semibold">{selected.size}</span> selected
                  </p>
                  <button onClick={toggleAll} className="text-xs text-brand-400 hover:text-brand-300 font-medium transition-colors">
                    {selected.size === transactions.length ? 'Deselect all' : 'Select all'}
                  </button>
                </div>

                {/* Transaction list */}
                <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                  {transactions.map(txn => (
                    <div
                      key={txn.id}
                      onClick={() => setSelected(prev => {
                        const next = new Set(prev)
                        next.has(txn.id) ? next.delete(txn.id) : next.add(txn.id)
                        return next
                      })}
                      className={cn(
                        'flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all',
                        selected.has(txn.id)
                          ? 'bg-brand-500/8 border-brand-500/25'
                          : 'bg-surface-800/40 border-white/6 opacity-50'
                      )}
                    >
                      {/* Checkbox */}
                      <div className={cn(
                        'w-4 h-4 rounded-md border-2 flex items-center justify-center flex-shrink-0 transition-all',
                        selected.has(txn.id) ? 'bg-brand-500 border-brand-500' : 'border-surface-600'
                      )}>
                        {selected.has(txn.id) && <CheckCircle className="w-3 h-3 text-white" />}
                      </div>

                      {/* Icon */}
                      <div className={cn(
                        'w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0',
                        txn.type === 'income' ? 'bg-green-500/10' : 'bg-rose-500/10'
                      )}>
                        {txn.type === 'income'
                          ? <TrendingUp className="w-4 h-4 text-green-400" />
                          : <TrendingDown className="w-4 h-4 text-rose-400" />
                        }
                      </div>

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-surface-200 truncate">{txn.merchant}</p>
                        <p className="text-xs text-surface-500 truncate">{txn.description.slice(0, 50)}</p>
                      </div>

                      {/* Amount + date */}
                      <div className="text-right flex-shrink-0">
                        <p className={cn('text-sm font-bold', txn.type === 'income' ? 'text-green-400' : 'text-rose-400')}>
                          {txn.type === 'income' ? '+' : '–'}₹{txn.amount.toLocaleString('en-IN')}
                        </p>
                        <p className="text-xs text-surface-600">{txn.date}</p>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="flex gap-3 pt-2 border-t border-white/8">
                  <Button
                    variant="secondary"
                    className="flex-1"
                    onClick={() => { clearGmailToken(); setStep('enter-email') }}
                  >
                    Cancel
                  </Button>
                  <Button
                    className="flex-1"
                    disabled={selected.size === 0}
                    loading={importing}
                    onClick={handleImport}
                  >
                    <Download className="w-4 h-4" />
                    Import {selected.size} Transaction{selected.size !== 1 ? 's' : ''}
                  </Button>
                </div>
              </>
            )}
          </motion.div>
        )}

        {/* ── Step 4: Done ── */}
        {step === 'done' && (
          <motion.div
            key="done"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="py-10 flex flex-col items-center gap-4 text-center"
          >
            <div className="w-16 h-16 rounded-2xl bg-green-500/10 flex items-center justify-center">
              <CheckCircle className="w-8 h-8 text-green-400" />
            </div>
            <div>
              <p className="text-lg font-bold text-surface-50">Import Complete!</p>
              <p className="text-sm text-surface-500 mt-1">
                Successfully imported <span className="text-green-400 font-semibold">{importedCount}</span> transactions from Gmail.
              </p>
            </div>
            <Button onClick={handleClose} className="mt-2">
              View Transactions
            </Button>
          </motion.div>
        )}

      </AnimatePresence>
    </Modal>
  )
}
