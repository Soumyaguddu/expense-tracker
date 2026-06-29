// AES-256-GCM client-side encryption for transaction amounts
// The plaintext amount NEVER leaves the client unencrypted

const ALGORITHM = 'AES-GCM'
const KEY_LENGTH = 256

// Derive a per-user key from userId + passphrase using PBKDF2
export async function deriveKey(userId: string, salt: string): Promise<CryptoKey> {
  const encoder = new TextEncoder()
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    encoder.encode(userId),
    { name: 'PBKDF2' },
    false,
    ['deriveKey']
  )

  return crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: encoder.encode(salt),
      iterations: 100000,
      hash: 'SHA-256',
    },
    keyMaterial,
    { name: ALGORITHM, length: KEY_LENGTH },
    false,
    ['encrypt', 'decrypt']
  )
}

// Encrypt a number amount → base64 ciphertext string
export async function encryptAmount(amount: number, key: CryptoKey): Promise<string> {
  const encoder = new TextEncoder()
  const iv = crypto.getRandomValues(new Uint8Array(12))
  const data = encoder.encode(amount.toString())

  const encrypted = await crypto.subtle.encrypt(
    { name: ALGORITHM, iv },
    key,
    data
  )

  // Pack iv + ciphertext into single base64 string
  const combined = new Uint8Array(iv.byteLength + encrypted.byteLength)
  combined.set(iv, 0)
  combined.set(new Uint8Array(encrypted), iv.byteLength)

  return btoa(String.fromCharCode(...combined))
}

// Decrypt base64 ciphertext → number amount
export async function decryptAmount(ciphertext: string, key: CryptoKey): Promise<number> {
  const combined = Uint8Array.from(atob(ciphertext), c => c.charCodeAt(0))
  const iv = combined.slice(0, 12)
  const data = combined.slice(12)

  const decrypted = await crypto.subtle.decrypt(
    { name: ALGORITHM, iv },
    key,
    data
  )

  return parseFloat(new TextDecoder().decode(decrypted))
}

// Generate masked display string e.g. "₹12,345" → "₹**,***"
export function maskAmount(amount: number, currency = '₹'): string {
  const str = Math.abs(amount).toFixed(0)
  const masked = str.replace(/\d/g, '*')
  // Add commas in same positions
  const formatted = masked.replace(/\B(?=(\d{3})+(?!\d))/g, ',')
  return `${currency}${formatted}`
}

// Format amount for display
export function formatAmount(amount: number, currency = '₹'): string {
  return `${currency}${Math.abs(amount).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

// Simple encryption key stored in sessionStorage (cleared on tab close)
// In production, consider WebAuthn or derived from biometric
const SESSION_KEY = 'et_session_key'

export function storeSessionKey(key: string): void {
  sessionStorage.setItem(SESSION_KEY, key)
}

export function getSessionKey(): string | null {
  return sessionStorage.getItem(SESSION_KEY)
}

export function clearSessionKey(): void {
  sessionStorage.removeItem(SESSION_KEY)
}
