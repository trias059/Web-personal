import type { CurhatEntry, MoodLabel } from './types'

/** Sama dengan labelThreshold di backend/internal/ai/sentiment.go. */
const MOOD_THRESHOLD = 0.1

export function moodLabel(score: number): MoodLabel {
  if (score >= MOOD_THRESHOLD) return 'positif'
  if (score <= -MOOD_THRESHOLD) return 'negatif'
  return 'netral'
}

/** Warna penanda tiap label; teks tetap memakai warna teks biasa. */
export const MOOD_COLOR: Record<MoodLabel, string> = {
  positif: 'var(--color-mood-up)',
  netral: 'var(--color-muted)',
  negatif: 'var(--color-mood-down)',
}

const scoreFormat = new Intl.NumberFormat('id-ID', {
  signDisplay: 'exceptZero',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
})

export const formatScore = (score: number) => scoreFormat.format(score)

export interface DayMood {
  day: string
  score: number
  count: number
}

function localDay(iso: string): string {
  const d = new Date(iso)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

/** Entri dalam rentang N hari terakhir (null = semua). */
export function entriesWithin(entries: CurhatEntry[], days: number | null): CurhatEntry[] {
  if (days === null) return entries
  const since = Date.now() - days * 86_400_000
  return entries.filter((entry) => new Date(entry.created_at).getTime() >= since)
}

/** Rata-rata skor mood per hari (zona waktu lokal), urut dari yang terlama. */
export function dailyMoods(entries: CurhatEntry[]): DayMood[] {
  const byDay = new Map<string, number[]>()
  for (const entry of entries) {
    const day = localDay(entry.created_at)
    byDay.set(day, [...(byDay.get(day) ?? []), entry.mood_score])
  }
  return [...byDay.entries()]
    .map(([day, scores]) => ({ day, score: average(scores), count: scores.length }))
    .sort((a, b) => a.day.localeCompare(b.day))
}

export function average(values: number[]): number {
  return values.length ? values.reduce((sum, v) => sum + v, 0) / values.length : 0
}
