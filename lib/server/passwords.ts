import { createHash, randomBytes, randomInt, timingSafeEqual } from 'node:crypto'
import bcrypt from 'bcryptjs'

const BCRYPT_COST = 12
const READABLE = 'ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789'

export function hashPassword(password: string) {
  return bcrypt.hash(password, BCRYPT_COST)
}

export function verifyPassword(password: string, hash: string) {
  return bcrypt.compare(password, hash)
}

// Unknown usernames still pay the bcrypt cost so response timing doesn't reveal which accounts exist.
let dummyHash: Promise<string> | null = null
export async function burnPasswordCheck(password: string) {
  dummyHash ??= bcrypt.hash('rts-dummy-password', BCRYPT_COST)
  await bcrypt.compare(password, await dummyHash)
}

export function generateTemporaryPassword(length = 10) {
  let out = ''
  for (let i = 0; i < length; i++) out += READABLE[randomInt(READABLE.length)]
  return out
}

export function generateToken() {
  return randomBytes(32).toString('base64url')
}

export function sha256(value: string) {
  return createHash('sha256').update(value).digest('hex')
}

export function safeEqual(a: string, b: string) {
  const ab = Buffer.from(sha256(a))
  const bb = Buffer.from(sha256(b))
  return timingSafeEqual(ab, bb)
}

export function passwordPolicyError(password: string): string | null {
  if (password.length < 8) return 'Password must be at least 8 characters.'
  if (password.length > 72) return 'Password must be at most 72 characters.'
  if (!/[A-Za-z]/.test(password) || !/\d/.test(password)) return 'Use at least one letter and one number.'
  return null
}
