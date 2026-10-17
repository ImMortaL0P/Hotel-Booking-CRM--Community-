import { clsx, type ClassValue } from "clsx"
import { extendTailwindMerge, twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount)
}

export function formatDate(dateString: string): string {
  // Check if ISO or just YYYY-MM-DD
  const date = new Date(dateString)
  if (isNaN(date.getTime())) return dateString
  
  return new Intl.DateTimeFormat('en-IN', {
    day: '2-digit',
    month: 'short',
    year: '2-digit'
  }).format(date)
}

/**
 * Short, collision-resistant ids like "RCPT-MFX3K2A9Q". The old 4-digit random
 * suffix allowed only 9,000 ids per prefix, so saves started failing with
 * duplicate-key errors once a few dozen records existed.
 */
export function generateId(prefix: string): string {
  const time = Date.now().toString(36).slice(-6);
  const rand = (typeof crypto !== 'undefined' && 'getRandomValues' in crypto)
    ? Array.from(crypto.getRandomValues(new Uint8Array(3)), b => (b % 36).toString(36)).join('')
    : Math.random().toString(36).slice(2, 5);
  return `${prefix}-${time}${rand}`.toUpperCase();
}

/** Booking ids keep the "SP-<year>-" shape staff are used to */
export function generateBookingId(date = new Date()): string {
  return generateId(`SP-${date.getFullYear()}`);
}
