import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Bot, NotebookPen, Pencil, Sparkles, Trash2 } from 'lucide-react'
import { useEffect, useState, type ReactNode } from 'react'

import ChatPanel from '../components/ChatPanel'
import MoodChart from '../components/MoodChart'
import RichText from '../components/RichText'
import { Button, Card, EmptyState, ErrorNote, PageHeader, QueryView } from '../components/ui'
import { api } from '../lib/api'
import { formatDate, formatDateTime } from '../lib/format'
import { handleSubmit } from '../lib/forms'
import { average, dailyMoods, entriesWithin, formatScore, MOOD_COLOR, moodLabel } from '../lib/mood'
import { roomById } from '../lib/rooms'
import { inputClass } from '../lib/styles'
import type { CurhatEntry, MoodLabel, Sentiment } from '../lib/types'

const CURHAT_KEY = ['curhat']

const RANGES: { days: number | null; label: string }[] = [
  { days: 7, label: '7 hari' },
  { days: 30, label: '30 hari' },
  { days: 90, label: '90 hari' },
  { days: null, label: 'Semua' },
]

export default function Curhat() {
  const room = roomById('curhat')
  const query = useQuery({ queryKey: CURHAT_KEY, queryFn: () => api<CurhatEntry[]>('/curhat') })

  return (
    <>
      <PageHeader
        icon={room.icon}
        tint={room.tint}
        eyebrow={room.place}
        title={room.name}
        description="Ruang pribadimu: hanya kamu yang bisa membuka kamar ini. Mood setiap entri dianalisis otomatis."
      />
      <QueryView query={query}>
        {(entries) => (
          <div className="space-y-8">
            <MoodOverview entries={entries} />
            <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_26rem]">
              <div className="space-y-6">
                <Composer />
                {entries.length === 0 ? (
                  <EmptyState icon={NotebookPen} title="Belum ada entri">
                    Tulis entri pertamamu di atas.
                  </EmptyState>
                ) : (
                  <ol className="space-y-4">
                    {entries.map((entry) => (
                      <EntryCard key={entry.id} entry={entry} />
                    ))}
                  </ol>
                )}
              </div>
              <Card className="lg:sticky lg:top-24">
                <h2 className="flex items-center gap-2 font-semibold">
                  <Sparkles className="size-4 text-accent" aria-hidden /> Teman curhat AI
                </h2>
                <p className="mt-1 mb-4 text-sm text-muted">Ngobrol santai. Percakapan ini tidak disimpan.</p>
                <ChatPanel mode="curhat" greeting="Hai, aku di sini. Mau cerita apa hari ini?" placeholder="Ceritakan apa yang kamu rasakan…" />
              </Card>
            </div>
          </div>
        )}
      </QueryView>
    </>
  )
}

function MoodOverview({ entries }: { entries: CurhatEntry[] }) {
  const [range, setRange] = useState<number | null>(30)
  const inRange = entriesWithin(entries, range)
  const days = dailyMoods(inRange)
  const avg = average(inRange.map((e) => e.mood_score))

  return (
    <section>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-lg font-semibold">Mood dari waktu ke waktu</h2>
        <div role="group" aria-label="Rentang waktu" className="flex gap-1 rounded-xl bg-sunken p-1">
          {RANGES.map((r) => (
            <button
              key={r.label}
              type="button"
              aria-pressed={range === r.days}
              onClick={() => setRange(r.days)}
              className={`rounded-lg px-3 py-1.5 text-sm font-semibold transition ${
                range === r.days ? 'bg-surface shadow-sm' : 'text-muted hover:text-ink'
              }`}
            >
              {r.label}
            </button>
          ))}
        </div>
      </div>
      <Card>
        {inRange.length === 0 ? (
          <p className="text-sm text-muted">Belum ada entri di rentang ini. Grafik muncul setelah kamu menulis.</p>
        ) : (
          <>
            <dl className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              <StatTile label="Rata-rata mood" className="col-span-2 sm:col-span-1">
                {formatScore(avg)} <MoodTag label={moodLabel(avg)} />
              </StatTile>
              <StatTile label="Hari tercatat">{days.length}</StatTile>
              <StatTile label="Entri">{inRange.length}</StatTile>
            </dl>
            <div className="mt-6">
              <MoodChart points={days} />
            </div>
            <details className="mt-4 text-sm">
              <summary className="cursor-pointer text-muted">Lihat data sebagai tabel</summary>
              <table className="mt-3 w-full text-left tabular-nums">
                <thead className="text-muted">
                  <tr>
                    <th className="py-1 font-medium">Tanggal</th>
                    <th className="py-1 font-medium">Rata-rata mood</th>
                    <th className="py-1 font-medium">Entri</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {days.map((d) => (
                    <tr key={d.day}>
                      <td className="py-1.5">{formatDate(d.day)}</td>
                      <td className="py-1.5">
                        {formatScore(d.score)} ({moodLabel(d.score)})
                      </td>
                      <td className="py-1.5">{d.count}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </details>
          </>
        )}
      </Card>
    </section>
  )
}

function StatTile({ label, className = '', children }: { label: string; className?: string; children: ReactNode }) {
  return (
    <div className={`rounded-xl bg-sunken px-4 py-3 ${className}`}>
      <dt className="text-sm text-muted">{label}</dt>
      <dd className="mt-1 flex items-center gap-2 text-2xl font-semibold">{children}</dd>
    </div>
  )
}

function MoodTag({ label, score }: { label: MoodLabel; score?: number }) {
  return (
    <span className="inline-flex items-center gap-1.5 text-sm font-medium">
      <span className="size-2.5 rounded-full" style={{ background: MOOD_COLOR[label] }} aria-hidden />
      {label}
      {score !== undefined && <span className="text-muted tabular-nums">({formatScore(score)})</span>}
    </span>
  )
}

function Composer() {
  const queryClient = useQueryClient()
  const [body, setBody] = useState('')
  const text = useDebounced(body.trim(), 500)
  const preview = useQuery({
    queryKey: ['sentiment', text],
    queryFn: () => api<Sentiment>('/ai/sentiment', 'POST', { text }),
    enabled: text.length >= 3,
    placeholderData: keepPreviousData,
  })
  const create = useMutation({
    mutationFn: () => api('/curhat', 'POST', { body }),
    onSuccess: async () => {
      setBody('')
      await queryClient.invalidateQueries({ queryKey: CURHAT_KEY })
    },
  })

  return (
    <Card>
      <form onSubmit={handleSubmit(create.mutate)} className="space-y-3">
        <label htmlFor="curhat-body" className="font-semibold">
          Apa yang kamu rasakan hari ini?
        </label>
        <textarea
          id="curhat-body"
          required
          rows={6}
          maxLength={10000}
          placeholder="Tulis saja apa adanya…"
          value={body}
          onChange={(e) => setBody(e.target.value)}
          className={inputClass}
        />
        {body.trim().length >= 3 && preview.data && <SentimentPreview sentiment={preview.data} />}
        {create.isError && <ErrorNote error={create.error} />}
        <Button type="submit" busy={create.isPending}>
          Simpan entri
        </Button>
      </form>
    </Card>
  )
}

function SentimentPreview({ sentiment }: { sentiment: Sentiment }) {
  return (
    <div className="flex flex-wrap items-center gap-2 rounded-xl bg-sunken px-3 py-2 text-sm">
      <span className="text-muted">Mood terdeteksi:</span>
      <MoodTag label={sentiment.label} score={sentiment.score} />
      {sentiment.terms.length > 0 && <span className="text-muted">dari kata</span>}
      {sentiment.terms.map((term, i) => (
        <span key={`${i}-${term.word}`} className="rounded-full bg-surface px-2 py-0.5 text-xs ring-1 ring-line">
          {term.word} {term.weight > 0 ? '+' : '−'}
        </span>
      ))}
    </div>
  )
}

function EntryCard({ entry }: { entry: CurhatEntry }) {
  const queryClient = useQueryClient()
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(entry.body)
  const refresh = () => queryClient.invalidateQueries({ queryKey: CURHAT_KEY })
  const update = useMutation({
    mutationFn: () => api(`/curhat/${entry.id}`, 'PUT', { body: draft }),
    onSuccess: async () => {
      await refresh()
      setEditing(false)
    },
  })
  const remove = useMutation({ mutationFn: () => api(`/curhat/${entry.id}`, 'DELETE'), onSuccess: refresh })
  const reply = useMutation({ mutationFn: () => api(`/curhat/${entry.id}/reply`, 'POST'), onSuccess: refresh })
  const error = update.error ?? remove.error ?? reply.error

  return (
    <li className="rounded-2xl border border-line bg-surface p-5 shadow-sm">
      <div className="flex flex-wrap items-center gap-3 text-sm text-muted">
        <time dateTime={entry.created_at}>{formatDateTime(entry.created_at)}</time>
        <MoodTag label={entry.mood_label} score={entry.mood_score} />
        {!editing && (
          <span className="ml-auto flex gap-1">
            <Button variant="ghost" size="sm" aria-label="Edit entri" onClick={() => setEditing(true)}>
              <Pencil className="size-4" aria-hidden />
            </Button>
            <Button
              variant="danger"
              size="sm"
              aria-label="Hapus entri"
              disabled={remove.isPending}
              onClick={() => confirm('Hapus entri ini?') && remove.mutate()}
            >
              <Trash2 className="size-4" aria-hidden />
            </Button>
          </span>
        )}
      </div>

      {editing ? (
        <form onSubmit={handleSubmit(update.mutate)} className="mt-3 space-y-2">
          <textarea required rows={5} maxLength={10000} value={draft} onChange={(e) => setDraft(e.target.value)} className={inputClass} />
          <p className="text-xs text-muted">Menyimpan perubahan akan menghitung ulang mood dan menghapus tanggapan AI lama.</p>
          <div className="flex gap-2">
            <Button type="submit" size="sm" busy={update.isPending}>
              Simpan
            </Button>
            <Button variant="ghost" size="sm" onClick={() => setEditing(false)}>
              Batal
            </Button>
          </div>
        </form>
      ) : (
        <p className="mt-3 leading-relaxed whitespace-pre-line">{entry.body}</p>
      )}

      {entry.ai_reply ? (
        <div className="mt-4 flex gap-3 rounded-xl bg-sunken p-4">
          <Bot className="mt-0.5 size-5 shrink-0 text-accent" aria-hidden />
          <div className="min-w-0">
            <p className="mb-1 text-xs font-semibold text-muted">Teman curhat AI</p>
            <RichText text={entry.ai_reply} />
          </div>
        </div>
      ) : (
        !editing && (
          <Button variant="secondary" size="sm" className="mt-4" busy={reply.isPending} onClick={() => reply.mutate()}>
            <Sparkles className="size-4" aria-hidden /> Minta tanggapan teman curhat AI
          </Button>
        )
      )}
      {error && (
        <div className="mt-3">
          <ErrorNote error={error} />
        </div>
      )}
    </li>
  )
}

function useDebounced<T>(value: T, delayMs: number): T {
  const [debounced, setDebounced] = useState(value)
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delayMs)
    return () => clearTimeout(timer)
  }, [value, delayMs])
  return debounced
}
