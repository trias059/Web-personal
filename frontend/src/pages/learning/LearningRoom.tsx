import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { BookOpen, Layers, Plus } from 'lucide-react'
import { useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router'

import ProgressBar from '../../components/ProgressBar'
import { Button, EmptyState, ErrorNote, PageHeader, QueryView } from '../../components/ui'
import { api } from '../../lib/api'
import { handleSubmit } from '../../lib/forms'
import { LEARNING_KEY } from '../../lib/queryClient'
import { roomById, TRACKS } from '../../lib/rooms'
import { buttonClass, inputClass } from '../../lib/styles'
import type { LearningItem, Track } from '../../lib/types'

export default function LearningRoom() {
  const room = roomById('learning')
  const [params, setParams] = useSearchParams()
  const track = TRACKS.find((t) => t.id === params.get('track')) ?? TRACKS[0]
  const query = useQuery({ queryKey: LEARNING_KEY, queryFn: () => api<LearningItem[]>('/learning') })
  const dueTotal = query.data?.reduce((sum, item) => sum + item.due_count, 0) ?? 0

  return (
    <>
      <PageHeader
        icon={room.icon}
        tint={room.tint}
        eyebrow={room.place}
        title={room.name}
        description="Catat materi, tanya AI tutor, buat kuis dari catatan, lalu ulangi dengan flashcard."
        actions={
          <Link to="/learning/review" className={buttonClass(dueTotal > 0 ? 'primary' : 'secondary')}>
            <Layers className="size-4" aria-hidden /> Review flashcard
            {dueTotal > 0 && <span className="rounded-full bg-on-accent/20 px-2 text-xs">{dueTotal}</span>}
          </Link>
        }
      />
      <QueryView query={query}>
        {(items) => (
          <>
            <div role="tablist" aria-label="Jalur belajar" className="grid gap-3 sm:grid-cols-3">
              {TRACKS.map((t) => {
                const list = items.filter((item) => item.track === t.id)
                const average = list.length ? list.reduce((sum, item) => sum + item.progress, 0) / list.length : 0
                const selected = t.id === track.id
                return (
                  <button
                    key={t.id}
                    type="button"
                    role="tab"
                    aria-selected={selected}
                    onClick={() => setParams({ track: t.id })}
                    className={`rounded-2xl border p-4 text-left transition ${
                      selected ? 'border-accent bg-accent-soft' : 'border-line bg-surface hover:bg-sunken'
                    }`}
                  >
                    <span className="flex items-baseline justify-between gap-2">
                      <span className="text-lg font-semibold">{t.name}</span>
                      <span className="text-sm text-muted">{list.length} materi</span>
                    </span>
                    <span className="mt-1 block text-sm text-muted">{t.description}</span>
                    <span className="mt-3 flex items-center gap-2 text-xs text-muted">
                      <ProgressBar value={average} label={`Rata-rata progres ${t.name}`} /> {Math.round(average)}%
                    </span>
                  </button>
                )
              })}
            </div>

            <section className="mt-8">
              <AddItemForm track={track.id} />
              {items.some((item) => item.track === track.id) ? (
                <ul className="mt-4 space-y-3">
                  {items
                    .filter((item) => item.track === track.id)
                    .map((item) => (
                      <li key={item.id}>
                        <ItemRow item={item} />
                      </li>
                    ))}
                </ul>
              ) : (
                <div className="mt-4">
                  <EmptyState icon={BookOpen} title={`Belum ada materi ${track.name}`}>
                    Tambahkan materi pertama lalu tulis catatannya.
                  </EmptyState>
                </div>
              )}
            </section>
          </>
        )}
      </QueryView>
    </>
  )
}

function ItemRow({ item }: { item: LearningItem }) {
  return (
    <Link
      to={`/learning/${item.id}`}
      className="flex flex-wrap items-center gap-4 rounded-2xl border border-line bg-surface p-4 shadow-sm transition hover:border-accent/50"
    >
      <div className="min-w-0 flex-1">
        <p className="font-semibold">{item.title}</p>
        <p className="text-sm text-muted">
          {item.card_count} flashcard{item.due_count > 0 && ` · ${item.due_count} perlu direview`}
        </p>
      </div>
      <div className="flex w-40 items-center gap-2 text-sm text-muted">
        <ProgressBar value={item.progress} label={`Progres ${item.title}`} /> {item.progress}%
      </div>
    </Link>
  )
}

function AddItemForm({ track }: { track: Track }) {
  const queryClient = useQueryClient()
  const navigate = useNavigate()
  const [title, setTitle] = useState('')
  const create = useMutation({
    mutationFn: () => api<LearningItem>('/learning', 'POST', { track, title }),
    onSuccess: async (item) => {
      await queryClient.invalidateQueries({ queryKey: LEARNING_KEY })
      navigate(`/learning/${item.id}`)
    },
  })

  return (
    <form onSubmit={handleSubmit(create.mutate)} className="flex flex-wrap gap-2">
      <label className="sr-only" htmlFor="new-item">
        Judul materi baru
      </label>
      <input
        id="new-item"
        required
        maxLength={200}
        placeholder="Judul materi baru, mis. Goroutine & channel"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        className={`${inputClass} min-w-0 flex-1`}
      />
      <Button type="submit" busy={create.isPending}>
        <Plus className="size-4" aria-hidden /> Tambah materi
      </Button>
      {create.isError && (
        <div className="w-full">
          <ErrorNote error={create.error} />
        </div>
      )}
    </form>
  )
}
