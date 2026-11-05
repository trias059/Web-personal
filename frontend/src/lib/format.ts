const dayFormat = new Intl.DateTimeFormat('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })
const dateTimeFormat = new Intl.DateTimeFormat('id-ID', {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
})

// Tanggal "YYYY-MM-DD" dibaca sebagai tanggal lokal agar tidak bergeser karena zona waktu.
function toDate(value: string): Date {
  return /^\d{4}-\d{2}-\d{2}$/.test(value) ? new Date(`${value}T00:00:00`) : new Date(value)
}

export const formatDate = (value: string) => dayFormat.format(toDate(value))

export const formatDateTime = (value: string) => dateTimeFormat.format(toDate(value))

export function todayISO(): string {
  const now = new Date()
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`
}

/** Teks jadwal review flashcard, mis. "hari ini" atau "3 hari lagi". */
export function dueLabel(dueAt: string): string {
  const days = Math.ceil((toDate(dueAt).getTime() - Date.now()) / 86_400_000)
  return days <= 0 ? 'hari ini' : days === 1 ? 'besok' : `${days} hari lagi`
}
