import { randomBytes } from 'node:crypto'

const ALPHABET = '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ'

/** Compact URL-safe random id (replaces the nanoid dependency). */
export function genId(size = 12): string {
  const bytes = randomBytes(size)
  let id = ''
  for (let i = 0; i < size; i++) id += ALPHABET[bytes[i] % ALPHABET.length]
  return id
}
