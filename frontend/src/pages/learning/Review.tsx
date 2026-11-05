import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ArrowLeft, PartyPopper } from 'lucide-react'
import { useState } from 'react'
import { Link, useSearchParams } from 'react-router'

import { Badge, Button, Card, ErrorNote, PageHeader, QueryView } from '../../components/ui'
import { api } from '../../lib/api'
import { LEARNING_KEY } from '../../lib/queryClient'
import { TRACKS } from '../../lib/rooms'
import { buttonClass } from '../../lib/styles'
import type { Flashcard, Grade } from '../../lib/types'

const GRADES: { grade: Grade; label: string; hint: string; variant: 'danger' | 'secondary' | 'primary' }[] = [
  { grade: 'again', label: 'Lupa', hint: 'muncul lagi sebentar', variant: 'danger' },
  { grade: 'hard', label: 'Sulit', hint: 'jeda pendek', variant: 'secondary' },
  { grade: 'good', label: 'Ingat', hint: 'jeda normal', variant: 'secondary' },
  { grade: 'easy', label: 'Mudah', hint: 'jeda panjang', variant: 'primary' },
]

export default function ReviewPage() {
  const [params, setParams] = useSearchParams()
  const track = TRACKS.find((t) => t.id === params.get('track'))?.id ?? ''

  return (
    <div className="mx-auto max-w-2xl">
      <Link to="/learning" className="inline-flex items-center gap-1 text-sm font-medium text-muted hover:text-ink">
        <ArrowLeft className="size-4" aria-hidden /> Learning Room
      </Link>
      <div className="mt-4">
        <PageHeader title="Review flashcard" description="Kartu yang jatuh tempo hari ini, dijadwalkan ulang dengan spaced repetition." />
      </div>
      <div role="tablist" aria-label="Filter jalur" className="mb-6 flex flex-wrap gap-2">
        {[{ id: '', name: 'Semua' }, ...TRACKS].map((t) => (
          <button
            key={t.id}
            type="button"
            role="tab"
            aria-selected={track === t.id}
            onClick={() => setParams(t.id ? { track: t.id } : {})}
            className={`rounded-full px-4 py-1.5 text-sm font-semibold ${
              track === t.id ? 'bg-accent text-on-accent' : 'bg-sunken text-muted hover:text-ink'
            }`}
          >
            {t.name}
          </button>
        ))}
      </div>
      {/* key: antrean dibuat ulang setiap kali filter jalur berganti. */}
      <Deck key={track} track={track} />
    </div>
  )
}

function Deck({ track }: { track: string }) {
  const queryClient = useQueryClient()
  const query = useQuery({
    queryKey: ['due', track],
    queryFn: () => api<Flashcard[]>(`/flashcards/due${track ? `?track=${track}` : ''}`),
    // Antrean sesi dikelola lokal; jangan diganti data baru di tengah sesi.
    staleTime: Infinity,
    gcTime: 0,
  })
  const [queue, setQueue] = useState<Flashcard[]>()
  const [revealed, setRevealed] = useState(false)
  const [reviewed, setReviewed] = useState(0)
  const cards = queue ?? query.data ?? []

  const review = useMutation({
    mutationFn: ({ card, grade }: { card: Flashcard; grade: Grade }) => api(`/flashcards/${card.id}/review`, 'POST', { grade }),
    onSuccess: (_, { card, grade }) => {
      const rest = cards.slice(1)
      // Kartu yang dilupakan kembali ke akhir antrean sesi ini.
      setQueue(grade === 'again' ? [...rest, card] : rest)
      setRevealed(false)
      if (grade !== 'again') setReviewed((n) => n + 1)
      void queryClient.invalidateQueries({ queryKey: LEARNING_KEY })
    },
  })

  return (
    <QueryView query={query}>
      {() => {
        const card = cards[0]
        if (!card) {
          return (
            <Card className="text-center">
              <PartyPopper className="mx-auto size-10 text-accent" aria-hidden />
              <p className="mt-3 text-lg font-semibold">
                {reviewed > 0 ? `Selesai! ${reviewed} kartu sudah direview.` : 'Tidak ada kartu yang perlu direview.'}
              </p>
              <p className="mt-1 text-sm text-muted">Kartu akan muncul lagi sesuai jadwalnya.</p>
              <Link to="/learning" className={`${buttonClass('secondary')} mt-5`}>
                Kembali ke Learning Room
              </Link>
            </Card>
          )
        }
        return (
          <Card>
            <div className="flex flex-wrap items-center gap-2 text-sm text-muted">
              <Badge className="bg-accent-soft text-accent">{TRACKS.find((t) => t.id === card.track)?.name}</Badge>
              <span className="truncate">{card.item_title}</span>
              <span className="ml-auto">{cards.length} kartu tersisa</span>
            </div>
            <p className="mt-6 text-center font-display text-2xl leading-snug sm:text-3xl">{card.question}</p>
            {revealed ? (
              <>
                <div className="mt-6 rounded-xl bg-sunken p-4 text-center whitespace-pre-line">{card.answer}</div>
                <p className="mt-6 text-center text-sm text-muted">Seberapa ingat kamu?</p>
                <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-4">
                  {GRADES.map(({ grade, label, hint, variant }) => (
                    <Button
                      key={grade}
                      variant={variant}
                      disabled={review.isPending}
                      onClick={() => review.mutate({ card, grade })}
                      className="flex-col"
                    >
                      {label}
                      <span className="text-xs font-normal opacity-80">{hint}</span>
                    </Button>
                  ))}
                </div>
              </>
            ) : (
              <div className="mt-8 text-center">
                <Button onClick={() => setRevealed(true)}>Tampilkan jawaban</Button>
              </div>
            )}
            {review.isError && (
              <div className="mt-4">
                <ErrorNote error={review.error} />
              </div>
            )}
          </Card>
        )
      }}
    </QueryView>
  )
}
