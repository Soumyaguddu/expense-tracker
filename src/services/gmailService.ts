// Gmail Import Service
// Uses Gmail API to fetch financial transaction emails and parse them

export interface ParsedTransaction {
  id: string           // gmail message id for dedup
  type: 'income' | 'expense'
  amount: number
  merchant: string
  description: string
  date: string         // yyyy-MM-dd
  source: 'gmail'
  raw: string          // original email snippet
}

// ── Regex patterns for Indian bank/payment emails ─────────────
const PATTERNS = [
  // Debit patterns
  { regex: /(?:debited|debit(?:ed)?|spent|paid|payment of|charged)\s+(?:rs\.?|inr|₹)\s*([0-9,]+(?:\.[0-9]{1,2})?)/i, type: 'expense' as const },
  { regex: /(?:rs\.?|inr|₹)\s*([0-9,]+(?:\.[0-9]{1,2})?)\s+(?:debited|deducted|paid|spent)/i, type: 'expense' as const },
  // UPI patterns
  { regex: /(?:upi|imps|neft|rtgs).*?(?:rs\.?|inr|₹)\s*([0-9,]+(?:\.[0-9]{1,2})?)/i, type: 'expense' as const },
  // Credit patterns
  { regex: /(?:credited|credit(?:ed)?|received|refund(?:ed)?)\s+(?:rs\.?|inr|₹)\s*([0-9,]+(?:\.[0-9]{1,2})?)/i, type: 'income' as const },
  { regex: /(?:rs\.?|inr|₹)\s*([0-9,]+(?:\.[0-9]{1,2})?)\s+(?:credited|received)/i, type: 'income' as const },
  // General amount with context
  { regex: /(?:amount|amt)[:\s]+(?:rs\.?|inr|₹)\s*([0-9,]+(?:\.[0-9]{1,2})?)/i, type: 'expense' as const },
]

// Merchant/payee patterns
const MERCHANT_PATTERNS = [
  /(?:at|to|from|merchant|payee)[:\s]+([A-Za-z0-9\s&'.,-]{2,40}?)(?:\s+on|\s+via|\s+ref|\.|\n|$)/i,
  /(?:vpa|upi id)[:\s]+([A-Za-z0-9@._-]{3,50})/i,
  /(?:paid to|sent to|transfer to)[:\s]+([A-Za-z0-9\s&'.,-]{2,40}?)(?:\s+on|\.|\n|$)/i,
]

// Financial email subject keywords
const FINANCIAL_SUBJECTS = [
  'debit', 'credit', 'transaction', 'payment', 'transfer',
  'upi', 'imps', 'neft', 'rtgs', 'statement', 'alert',
  'spent', 'received', 'debited', 'credited', 'purchase',
  'paytm', 'gpay', 'phonepe', 'razorpay', 'amazon pay',
]

function parseAmount(str: string): number {
  return parseFloat(str.replace(/,/g, ''))
}

function parseMerchant(text: string): string {
  for (const pat of MERCHANT_PATTERNS) {
    const m = text.match(pat)
    if (m) return m[1].trim().slice(0, 40)
  }
  return 'Unknown'
}

function parseDate(text: string): string {
  // Try common date formats in email
  const patterns = [
    /(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})/,
    /(\d{1,2})\s+(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\s+(\d{2,4})/i,
  ]
  for (const pat of patterns) {
    const m = text.match(pat)
    if (m) {
      try {
        return new Date(m[0]).toISOString().split('T')[0]
      } catch {}
    }
  }
  return new Date().toISOString().split('T')[0]
}

export function parseEmailBody(messageId: string, subject: string, body: string, date: string): ParsedTransaction | null {
  const text = `${subject} ${body}`.toLowerCase()

  // Check if it's a financial email
  const isFinancial = FINANCIAL_SUBJECTS.some(kw => text.includes(kw))
  if (!isFinancial) return null

  // Try to extract amount
  for (const { regex, type } of PATTERNS) {
    const match = `${subject} ${body}`.match(regex)
    if (match) {
      const amount = parseAmount(match[1])
      if (amount <= 0 || amount > 10000000) continue  // sanity check

      return {
        id: messageId,
        type,
        amount,
        merchant: parseMerchant(`${subject} ${body}`),
        description: subject.slice(0, 100),
        date: parseDate(`${subject} ${body}`) || date,
        source: 'gmail',
        raw: body.slice(0, 200),
      }
    }
  }

  return null
}

// ── Gmail OAuth helpers ───────────────────────────────────────

const GMAIL_CLIENT_ID = import.meta.env.VITE_GMAIL_CLIENT_ID as string
const GMAIL_SCOPES = 'https://www.googleapis.com/auth/gmail.readonly'

export function getGmailAuthUrl(email: string): string {
  const params = new URLSearchParams({
    client_id: GMAIL_CLIENT_ID || '',
    redirect_uri: `${window.location.origin}/auth/gmail-callback`,
    response_type: 'token',
    scope: GMAIL_SCOPES,
    login_hint: email,
    prompt: 'consent',
  })
  return `https://accounts.google.com/o/oauth2/v2/auth?${params}`
}

export async function fetchGmailTransactions(
  accessToken: string,
  maxResults = 50
): Promise<ParsedTransaction[]> {
  const query = encodeURIComponent(
    'subject:(debit OR credit OR transaction OR payment OR UPI OR IMPS OR NEFT OR spent OR received) newer_than:30d'
  )

  // 1. List matching messages
  const listRes = await fetch(
    `https://gmail.googleapis.com/gmail/v1/users/me/messages?q=${query}&maxResults=${maxResults}`,
    { headers: { Authorization: `Bearer ${accessToken}` } }
  )

  if (!listRes.ok) throw new Error('Failed to fetch Gmail messages. Token may be expired.')

  const listData = await listRes.json()
  const messages: { id: string }[] = listData.messages ?? []

  if (!messages.length) return []

  // 2. Fetch each message and parse
  const results: ParsedTransaction[] = []

  for (const msg of messages.slice(0, maxResults)) {
    try {
      const msgRes = await fetch(
        `https://gmail.googleapis.com/gmail/v1/users/me/messages/${msg.id}?format=metadata&metadataHeaders=Subject&metadataHeaders=Date`,
        { headers: { Authorization: `Bearer ${accessToken}` } }
      )
      if (!msgRes.ok) continue

      const msgData = await msgRes.json()
      const headers: { name: string; value: string }[] = msgData.payload?.headers ?? []
      const subject = headers.find(h => h.name === 'Subject')?.value ?? ''
      const dateStr = headers.find(h => h.name === 'Date')?.value ?? ''
      const snippet = msgData.snippet ?? ''
      const date = dateStr ? new Date(dateStr).toISOString().split('T')[0] : new Date().toISOString().split('T')[0]

      const parsed = parseEmailBody(msg.id, subject, snippet, date)
      if (parsed) results.push(parsed)
    } catch {
      // skip individual message errors
    }
  }

  return results
}

// Store token in sessionStorage
export function storeGmailToken(token: string) {
  sessionStorage.setItem('gmail_access_token', token)
}

export function getGmailToken(): string | null {
  return sessionStorage.getItem('gmail_access_token')
}

export function clearGmailToken() {
  sessionStorage.removeItem('gmail_access_token')
}
