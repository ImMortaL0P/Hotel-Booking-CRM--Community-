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

export function generateId(prefix: string): string {
  const ran = Math.floor(1000 + Math.random() * 9000);
  return `${prefix}-${ran}`;
}
