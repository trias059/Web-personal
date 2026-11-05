import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ArrowLeft, Bot, CheckCircle2, Layers, ListChecks, Plus, Trash2, XCircle } from 'lucide-react'
import { useId, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router'

import ChatPanel from '../../components/ChatPanel'
import { Badge, Button, Card, EmptyState, ErrorNote, Field, QueryView } from '../../components/ui'
import { api } from '../../lib/api'
import { dueLabel } from '../../lib/format'
import { handleSubmit } from '../../lib/forms'
import { flashcardsKey, LEARNING_KEY } from '../../lib/queryClient'
import { TRACKS } from '../../lib/rooms'
import { buttonClass, fieldClass, inputClass } from '../../lib/styles'
import type { Flashcard, LearningItem, QuizQuestion, Track } from '../../lib/types'

export default function LearningItemPage() {
  const { id } = useParams()
  const query = useQuery({ queryKey: [...LEARNING_KEY, id], queryFn: () => api<LearningItem>(`/learning/${id}`) })

  return (
    <>
      <Link to="/learning" className="inline-flex items-center gap-1 text-sm font-medium text-muted hover:text-ink">
        <ArrowLeft className="size-4" aria-hidden /> Learning Room
      </Link>
      <QueryView query={query}>{(item) => <Workspace key={item.id} item={item} />}</QueryView>
    </>
  )
}

const TABS = [
  { id: 'tutor', label: 'Tutor AI', icon: Bot },
  { id: 'quiz', label: 'Kuis AI', icon: ListChecks },
  { id: 'cards', label: 'Flashcard', icon: Layers },
] as const

function Workspace({ item }: { item: LearningItem }) {
  const [tab, setTab] = useState<(typeof TABS)[number]['id']>('tutor')
  return (
    <div className="mt-4 grid items-start gap-6 lg:grid-cols-2">
      <ItemEditor item={item} />
      <Card>
        <div role="tablist" className="mb-5 flex gap-1 rounded-xl bg-sunken p-1">
          {TABS.map((t) => (
            <button
              key={t.id}
              type="button"
              role="tab"
              aria-selected={tab === t.id}
              onClick={() => setTab(t.id)}
              className={`flex flex-1 items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-sm font-semibold transition ${
                tab === t.id ? 'bg-surface shadow-sm' : 'text-muted hover:text-ink'
              }`}
            >
              <t.icon className="size-4" aria-hidden /> {t.label}
              {t.id === 'cards' && item.card_count > 0 && <span className="text-xs text-muted">{item.card_count}</span>}
            </button>
          ))}
        </div>
        {/* Panel disembunyikan, bukan dilepas, supaya riwayat chat dan kuis tidak hilang saat pindah tab. */}
        <div hidden={tab !== 'tutor'}>
          <ChatPanel
            mode="tutor"
            learningItemId={item.id}
            greeting={`Halo! Aku tutor AI untuk materi "${item.title}". Tanyakan apa saja; aku juga membaca catatanmu di sebelah.`}
            placeholder="Tanya tentang materi ini…"
          />
        </div>
        <div hidden={tab !== 'quiz'}>
          <QuizPanel item={item} />
        </div>
        <div hidden={tab !== 'cards'}>
          <FlashcardPanel item={item} />
        </div>
      </Card>
    </div>
  )
}

function ItemEditor({ item }: { item: LearningItem }) {
  const queryClient = useQueryClient()
  const navigate = useNavigate()
  const [form, setForm] = useState({ title: item.title, track: item.track, progress: item.progress, notes: item.notes })
  const dirty =
    form.title !== item.title || form.track !== item.track || form.progress !== item.progress || form.notes !== item.notes

  const save = useMutation({
    mutationFn: () => api<LearningItem>(`/learning/${item.id}`, 'PUT', form),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: LEARNING_KEY }),
  })
  const remove = useMutation({
    mutationFn: () => api(`/learning/${item.id}`, 'DELETE'),
    onSuccess: () => {
      queryClient.removeQueries({ queryKey: [...LEARNING_KEY, String(item.id)] })
      void queryClient.invalidateQueries({ queryKey: LEARNING_KEY, exact: true })
      navigate(`/learning?track=${item.track}`)
    },
  })

  return (
    <Card>
      <form onSubmit={handleSubmit(save.mutate)} className="space-y-4">
        <Field label="Judul materi">
          <input
            required
            maxLength={200}
            value={form.title}
            onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
            className={`${inputClass} font-semibold`}
          />
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Jalur">
            <select
              value={form.track}
              onChange={(e) => setForm((f) => ({ ...f, track: e.target.value as Track }))}
              className={inputClass}
            >
              {TRACKS.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
          </Field>
          <Field label={`Progres: ${form.progress}%`}>
            <input
              type="range"
              min={0}
              max={100}
              step={5}
              value={form.progress}
              onChange={(e) => setForm((f) => ({ ...f, progress: Number(e.target.value) }))}
              className="mt-3 w-full accent-accent"
            />
          </Field>
        </div>
        <Field label="Catatan" hint="Catatan ini menjadi bahan AI tutor dan generator kuis.">
          <textarea
            rows={14}
            maxLength={50000}
            placeholder="Tulis ringkasan materi, contoh, atau kosakata baru…"
            value={form.notes}
            onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
            className={`${inputClass} font-mono text-[13px] leading-relaxed`}
          />
        </Field>
        {save.isError && <ErrorNote error={save.error} />}
        {remove.isError && <ErrorNote error={remove.error} />}
        <div className="flex flex-wrap items-center gap-2">
          <Button type="submit" busy={save.isPending} disabled={!dirty}>
            Simpan
          </Button>
          {!dirty && save.isSuccess && <span className="text-sm text-good">Tersimpan</span>}
          <Button
            variant="danger"
            className="ml-auto"
            busy={remove.isPending}
            onClick={() => confirm(`Hapus "${item.title}" beserta flashcard-nya?`) && remove.mutate()}
          >
            <Trash2 className="size-4" aria-hidden /> Hapus materi
          </Button>
        </div>
      </form>
    </Card>
  )
}

function QuizPanel({ item }: { item: LearningItem }) {
  const queryClient = useQueryClient()
  const name = useId()
  const [count, setCount] = useState(5)
  const [answers, setAnswers] = useState<Record<number, number>>({})
  const [checked, setChecked] = useState(false)

  const generate = useMutation({
    mutationFn: () => api<{ questions: QuizQuestion[] }>('/ai/quiz', 'POST', { learning_item_id: item.id, count }),
    onSuccess: () => {
      setAnswers({})
      setChecked(false)
    },
  })
  const questions = generate.data?.questions ?? []
  const saveCards = useMutation({
    mutationFn: () =>
      api(`/learning/${item.id}/flashcards`, 'POST', {
        cards: questions.map((q) => ({
          question: q.question,
          answer: q.explanation ? `${q.choices[q.answer]}\n\n${q.explanation}` : q.choices[q.answer],
        })),
      }),
    onSuccess: () =>
      Promise.all([
        queryClient.invalidateQueries({ queryKey: flashcardsKey(item.id) }),
        queryClient.invalidateQueries({ queryKey: LEARNING_KEY }),
      ]),
  })
  const score = questions.filter((q, i) => answers[i] === q.answer).length

  return (
    <div className="space-y-5">
      <p className="text-sm text-muted">AI membuat soal pilihan ganda dari catatan yang sudah disimpan.</p>
      <div className="flex flex-wrap items-center gap-2">
        <label className="sr-only" htmlFor={`${name}-count`}>
          Jumlah soal
        </label>
        <select id={`${name}-count`} value={count} onChange={(e) => setCount(Number(e.target.value))} className={fieldClass}>
          {[3, 5, 10].map((n) => (
            <option key={n} value={n}>
              {n} soal
            </option>
          ))}
        </select>
        <Button onClick={() => generate.mutate()} busy={generate.isPending} disabled={!item.notes.trim()}>
          Buat kuis
        </Button>
      </div>
      {!item.notes.trim() && <p className="text-sm text-muted">Simpan catatan materi dulu agar AI punya bahan soal.</p>}
      {generate.isError && <ErrorNote error={generate.error} />}

      {questions.length > 0 && (
        <>
          <ol className="space-y-6">
            {questions.map((q, i) => (
              <li key={`${generate.submittedAt}-${i}`}>
                <p className="font-medium">
                  {i + 1}. {q.question}
                </p>
                <div className="mt-2 grid gap-2">
                  {q.choices.map((choice, c) => {
                    const chosen = answers[i] === c
                    const tone = !checked
                      ? chosen
                        ? 'border-accent bg-accent-soft'
                        : 'border-line hover:bg-sunken'
                      : c === q.answer
                        ? 'border-good bg-good-soft'
                        : chosen
                          ? 'border-bad bg-bad-soft'
                          : 'border-line opacity-70'
                    return (
                      <label key={c} className={`flex cursor-pointer items-center gap-2 rounded-xl border px-3 py-2 text-sm ${tone}`}>
                        <input
                          type="radio"
                          name={`${name}-${i}`}
                          checked={chosen}
                          disabled={checked}
                          onChange={() => setAnswers((a) => ({ ...a, [i]: c }))}
                          className="accent-accent"
                        />
                        <span className="flex-1">{choice}</span>
                        {checked && c === q.answer && <CheckCircle2 className="size-4 text-good" aria-label="Jawaban benar" />}
                        {checked && chosen && c !== q.answer && <XCircle className="size-4 text-bad" aria-label="Jawabanmu" />}
                      </label>
                    )
                  })}
                </div>
                {checked && q.explanation && <p className="mt-2 text-sm text-muted">{q.explanation}</p>}
              </li>
            ))}
          </ol>
          {checked ? (
            <div className="flex flex-wrap items-center gap-3 rounded-xl bg-sunken p-4">
              <p className="font-semibold">
                Skor: {score}/{questions.length}
              </p>
              <Button
                variant="secondary"
                size="sm"
                className="ml-auto"
                busy={saveCards.isPending}
                disabled={saveCards.isSuccess}
                onClick={() => saveCards.mutate()}
              >
                <Layers className="size-4" aria-hidden /> {saveCards.isSuccess ? 'Tersimpan sebagai flashcard' : 'Simpan sebagai flashcard'}
              </Button>
              {saveCards.isError && <ErrorNote error={saveCards.error} />}
            </div>
          ) : (
            <Button onClick={() => setChecked(true)} disabled={Object.keys(answers).length < questions.length}>
              Periksa jawaban
            </Button>
          )}
        </>
      )}
    </div>
  )
}

function FlashcardPanel({ item }: { item: LearningItem }) {
  const queryClient = useQueryClient()
  const key = flashcardsKey(item.id)
  const query = useQuery({ queryKey: key, queryFn: () => api<Flashcard[]>(`/learning/${item.id}/flashcards`) })
  const refresh = () =>
    Promise.all([queryClient.invalidateQueries({ queryKey: key }), queryClient.invalidateQueries({ queryKey: LEARNING_KEY })])

  const [question, setQuestion] = useState('')
  const [answer, setAnswer] = useState('')
  const add = useMutation({
    mutationFn: () => api(`/learning/${item.id}/flashcards`, 'POST', { cards: [{ question, answer }] }),
    onSuccess: async () => {
      setQuestion('')
      setAnswer('')
      await refresh()
    },
  })
  const remove = useMutation({ mutationFn: (id: number) => api(`/flashcards/${id}`, 'DELETE'), onSuccess: refresh })

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-muted">Kartu baru langsung masuk antrean review.</p>
        <Link to={`/learning/review?track=${item.track}`} className={buttonClass('secondary', 'sm')}>
          <Layers className="size-4" aria-hidden /> Review jalur ini
        </Link>
      </div>
      <QueryView query={query}>
        {(cards) =>
          cards.length === 0 ? (
            <EmptyState icon={Layers} title="Belum ada flashcard">
              Tambah manual atau simpan hasil kuis AI.
            </EmptyState>
          ) : (
            <ul className="divide-y divide-line">
              {cards.map((card) => (
                <li key={card.id} className="flex gap-3 py-3">
                  <div className="min-w-0 flex-1">
                    <p className="font-medium">{card.question}</p>
                    <p className="mt-0.5 text-sm whitespace-pre-line text-muted">{card.answer}</p>
                  </div>
                  <div className="flex shrink-0 flex-col items-end gap-1">
                    <Badge>Review {dueLabel(card.due_at)}</Badge>
                    <Button
                      variant="danger"
                      size="sm"
                      aria-label="Hapus kartu"
                      disabled={remove.isPending}
                      onClick={() => confirm('Hapus kartu ini?') && remove.mutate(card.id)}
                    >
                      <Trash2 className="size-4" aria-hidden />
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          )
        }
      </QueryView>
      <form onSubmit={handleSubmit(add.mutate)} className="space-y-3 border-t border-line pt-4">
        <Field label="Pertanyaan">
          <input required maxLength={1000} value={question} onChange={(e) => setQuestion(e.target.value)} className={inputClass} />
        </Field>
        <Field label="Jawaban">
          <textarea required rows={2} maxLength={2000} value={answer} onChange={(e) => setAnswer(e.target.value)} className={inputClass} />
        </Field>
        {add.isError && <ErrorNote error={add.error} />}
        <Button type="submit" size="sm" busy={add.isPending}>
          <Plus className="size-4" aria-hidden /> Tambah kartu
        </Button>
      </form>
    </div>
  )
}
