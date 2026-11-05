import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ArrowLeft, ArrowRight, CalendarDays, MessageCircle, Pencil, Plus, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router'

import Comments from '../components/Comments'
import MediaView from '../components/MediaView'
import { Button, Card, EmptyState, ErrorNote, Field, PageHeader, QueryView } from '../components/ui'
import { VisibilityBadge, VisibilityPicker } from '../components/Visibility'
import { api } from '../lib/api'
import type { ContentConfig } from '../lib/content'
import { formatDate, todayISO } from '../lib/format'
import { handleSubmit } from '../lib/forms'
import { roomById } from '../lib/rooms'
import { inputClass } from '../lib/styles'
import type { Content, ContentInput } from '../lib/types'
import { useIsOwner } from '../store/auth'

export function ContentRoom({ config }: { config: ContentConfig }) {
  const isOwner = useIsOwner()
  const room = roomById(config.room)
  const [writing, setWriting] = useState(false)
  const query = useQuery({ queryKey: [config.apiPath], queryFn: () => api<Content[]>(config.apiPath) })

  return (
    <>
      <PageHeader
        icon={room.icon}
        tint={room.tint}
        eyebrow={room.place}
        title={room.name}
        description={config.copy.description}
        actions={
          isOwner &&
          !writing && (
            <Button onClick={() => setWriting(true)}>
              <Plus className="size-4" aria-hidden /> {config.copy.create}
            </Button>
          )
        }
      />
      {writing && (
        <Card className="mb-8">
          <ContentForm config={config} onDone={() => setWriting(false)} />
        </Card>
      )}
      <QueryView query={query}>
        {(items) =>
          items.length === 0 ? (
            <EmptyState icon={room.icon} title={config.copy.empty} />
          ) : config.layout === 'feed' ? (
            <div className="mx-auto max-w-3xl space-y-6">
              {items.map((item) => (
                <FeedCard key={item.id} item={item} path={`${room.path}/${item.id}`} showVisibility={isOwner} />
              ))}
            </div>
          ) : (
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {items.map((item) => (
                <GalleryCard key={item.id} item={item} path={`${room.path}/${item.id}`} showVisibility={isOwner} />
              ))}
            </div>
          )
        }
      </QueryView>
    </>
  )
}

export function ContentDetail({ config }: { config: ContentConfig }) {
  const { id } = useParams()
  const room = roomById(config.room)
  const isOwner = useIsOwner()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [editing, setEditing] = useState(false)
  const query = useQuery({ queryKey: [config.apiPath, id], queryFn: () => api<Content>(`${config.apiPath}/${id}`) })
  const remove = useMutation({
    mutationFn: () => api(`${config.apiPath}/${id}`, 'DELETE'),
    onSuccess: () => {
      queryClient.removeQueries({ queryKey: [config.apiPath, id] })
      void queryClient.invalidateQueries({ queryKey: [config.apiPath], exact: true })
      navigate(room.path)
    },
  })

  return (
    <div className="mx-auto max-w-3xl">
      <Link to={room.path} className="inline-flex items-center gap-1 text-sm font-medium text-muted hover:text-ink">
        <ArrowLeft className="size-4" aria-hidden /> {room.name}
      </Link>
      <QueryView query={query}>
        {(item) => (
          <>
            {editing ? (
              <Card className="mt-4">
                <ContentForm config={config} item={item} onDone={() => setEditing(false)} />
              </Card>
            ) : (
              <article className="mt-4">
                <p className="flex flex-wrap items-center gap-2 text-sm text-muted">
                  <CalendarDays className="size-4" aria-hidden /> {formatDate(item.happened_on)}
                  {isOwner && <VisibilityBadge value={item.visibility} />}
                </p>
                <h1 className="mt-2 font-display text-3xl sm:text-4xl">{item.title}</h1>
                {isOwner && (
                  <div className="mt-4 flex gap-2">
                    <Button variant="secondary" size="sm" onClick={() => setEditing(true)}>
                      <Pencil className="size-4" aria-hidden /> Edit
                    </Button>
                    <Button
                      variant="danger"
                      size="sm"
                      busy={remove.isPending}
                      onClick={() => confirm(`Hapus "${item.title}" beserta komentarnya?`) && remove.mutate()}
                    >
                      <Trash2 className="size-4" aria-hidden /> Hapus
                    </Button>
                  </div>
                )}
                {remove.isError && <ErrorNote error={remove.error} />}
                {item.media_url && (
                  <div className="mt-6">
                    <MediaView url={item.media_url} alt={item.title} />
                  </div>
                )}
                {item.body && <p className="mt-6 text-lg leading-relaxed whitespace-pre-line">{item.body}</p>}
              </article>
            )}
            <Comments targetType={config.targetType} targetId={item.id} contentKey={[config.apiPath]} />
          </>
        )}
      </QueryView>
    </div>
  )
}

interface CardProps {
  item: Content
  path: string
  showVisibility: boolean
}

function FeedCard({ item, path, showVisibility }: CardProps) {
  return (
    <article className="rounded-2xl border border-line bg-surface p-5 shadow-sm sm:p-6">
      <p className="flex flex-wrap items-center gap-2 text-sm text-muted">
        <CalendarDays className="size-4" aria-hidden /> {formatDate(item.happened_on)}
        {showVisibility && <VisibilityBadge value={item.visibility} />}
      </p>
      <h2 className="mt-1 text-xl font-semibold">
        <Link to={path} className="hover:text-accent">
          {item.title}
        </Link>
      </h2>
      {item.media_url && (
        <div className="mt-4">
          <MediaView url={item.media_url} alt={item.title} />
        </div>
      )}
      {item.body && <p className="mt-3 line-clamp-4 whitespace-pre-line">{item.body}</p>}
      <div className="mt-4 flex items-center justify-between text-sm">
        <span className="flex items-center gap-1.5 text-muted">
          <MessageCircle className="size-4" aria-hidden /> {item.comment_count} komentar
        </span>
        <Link to={path} className="flex items-center gap-1 font-semibold text-accent">
          Buka <ArrowRight className="size-4" aria-hidden />
        </Link>
      </div>
    </article>
  )
}

function GalleryCard({ item, path, showVisibility }: CardProps) {
  return (
    <Link
      to={path}
      className="group overflow-hidden rounded-2xl border border-line bg-surface shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
    >
      {item.media_url ? (
        <MediaView url={item.media_url} alt={item.title} variant="cover" />
      ) : (
        <div className="aspect-[4/3] bg-sunken p-6">
          <p className="line-clamp-6 font-display text-lg leading-snug">{item.body || item.title}</p>
        </div>
      )}
      <div className="p-4">
        <p className="text-xs text-muted">{formatDate(item.happened_on)}</p>
        <h2 className="font-semibold group-hover:text-accent">{item.title}</h2>
        <div className="mt-2 flex items-center gap-2 text-xs text-muted">
          {showVisibility && <VisibilityBadge value={item.visibility} />}
          <MessageCircle className="size-3.5" aria-hidden /> {item.comment_count}
        </div>
      </div>
    </Link>
  )
}

function ContentForm({ config, item, onDone }: { config: ContentConfig; item?: Content; onDone: () => void }) {
  const queryClient = useQueryClient()
  const [form, setForm] = useState<ContentInput>({
    title: item?.title ?? '',
    body: item?.body ?? '',
    media_url: item?.media_url ?? '',
    visibility: item?.visibility ?? 'shared',
    happened_on: item?.happened_on ?? todayISO(),
  })
  const mutation = useMutation({
    mutationFn: () => {
      const payload = { ...form, media_url: form.media_url.trim() }
      return item ? api(`${config.apiPath}/${item.id}`, 'PUT', payload) : api(config.apiPath, 'POST', payload)
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: [config.apiPath] })
      onDone()
    },
  })
  const set = <K extends keyof ContentInput>(key: K, value: ContentInput[K]) => setForm((f) => ({ ...f, [key]: value }))

  return (
    <form onSubmit={handleSubmit(mutation.mutate)} className="space-y-4">
      <h2 className="font-semibold">{item ? 'Edit' : config.copy.create}</h2>
      <div className="grid gap-4 sm:grid-cols-[1fr_12rem]">
        <Field label="Judul">
          <input
            required
            maxLength={200}
            placeholder={config.copy.titlePlaceholder}
            value={form.title}
            onChange={(e) => set('title', e.target.value)}
            className={inputClass}
          />
        </Field>
        <Field label={config.copy.dateLabel}>
          <input type="date" required value={form.happened_on} onChange={(e) => set('happened_on', e.target.value)} className={inputClass} />
        </Field>
      </div>
      <Field label={config.copy.bodyLabel}>
        <textarea rows={6} maxLength={20000} value={form.body} onChange={(e) => set('body', e.target.value)} className={inputClass} />
      </Field>
      <Field label="Media" hint={config.copy.mediaHint}>
        <input type="url" placeholder="https://" value={form.media_url} onChange={(e) => set('media_url', e.target.value)} className={inputClass} />
      </Field>
      <VisibilityPicker value={form.visibility} onChange={(v) => set('visibility', v)} />
      {mutation.isError && <ErrorNote error={mutation.error} />}
      <div className="flex gap-2">
        <Button type="submit" busy={mutation.isPending}>
          Simpan
        </Button>
        <Button variant="ghost" onClick={onDone}>
          Batal
        </Button>
      </div>
    </form>
  )
}
