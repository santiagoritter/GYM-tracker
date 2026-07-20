import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function uid(): string {
  return crypto.randomUUID()
}

export function nowIso(): string {
  return new Date().toISOString()
}

/** 1RM estimado con fórmula de Epley. Con 1 rep, el 1RM es el peso mismo. */
export function calc1RM(weightKg: number, reps: number): number {
  if (reps <= 0 || weightKg <= 0) return 0
  if (reps === 1) return weightKg
  return Math.round(weightKg * (1 + reps / 30) * 10) / 10
}

const KG_PER_LB = 0.45359237

export function formatWeight(kg: number, units: 'kg' | 'lbs'): string {
  if (units === 'lbs') return `${Math.round((kg / KG_PER_LB) * 10) / 10}`
  return `${Math.round(kg * 10) / 10}`
}

export function displayToKg(value: number, units: 'kg' | 'lbs'): number {
  return units === 'lbs' ? value * KG_PER_LB : value
}

export function formatDuration(startIso: string, endIso?: string): string {
  const start = new Date(startIso).getTime()
  const end = endIso ? new Date(endIso).getTime() : Date.now()
  const totalSec = Math.max(0, Math.floor((end - start) / 1000))
  const h = Math.floor(totalSec / 3600)
  const m = Math.floor((totalSec % 3600) / 60)
  const s = totalSec % 60
  if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
  return `${m}:${String(s).padStart(2, '0')}`
}

export function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('es-AR', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  })
}
