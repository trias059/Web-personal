import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { MessageCircle, Send, Trash2 } from 'lucide-react'
import { useState } from 'react'

import { api } from '../lib/api'
import { formatDateTime } from '../lib/format'
import { handleSubmit } from '../lib/forms'
import { ROLE_LABELS } from '../lib/rooms'
import { inputClass } from '../lib/styles'
import type { Comment } from '../lib/types'
import { useAuth } from '../store/auth'
import Avatar from './Avatar'
import { Badge, Button, ErrorNote, QueryView } from './ui'

interface Props {
  targetType: Comment['target_type']
  targetId: number
  /** Query konten induk, disegarkan agar jumlah komentarnya ikut berubah. */
  contentKey: string[]
}

export default function Comments({ targetType, targetId, contentKey }: Props) {
  const user = useAuth((s) => s.user)
  const queryClient = useQueryClient()
  const key = ['comments', targetType, targetId]
  const query = useQuery({
    queryKey: key,
    queryFn: () => api<Comment[]>(`/comments?target_type=${targetType}&target_id=${targetId}`),
  })
  const refresh = () =>
    Promise.all([queryClient.invalidateQueries({ queryKey: key }), queryClient.invalidateQueries({ queryKey: contentKey })])

  const [body, setBody] = useState('')
  const add = useMutation({
    mutationFn: () => api('/comments', 'POST', { target_type: targetType, target_id: targetId, body }),
    onSuccess: async () => {
      setBody('')
      await refresh()
    },
  })
  const remove = useMutation({
    mutationFn: (id: number) => api(`/comments/${id}`, 'DELETE'),
    onSuccess: refresh,
  })

  return (
    <section className="mt-10 border-t border-line pt-8">
      <h2 className="flex items-center gap-2 font-semibold">
        <MessageCircle className="size-5" aria-hidden /> Komentar
      </h2>
      <QueryView query={query}>
        {(comments) =>
          comments.length === 0 ? (
            <p className="mt-3 text-sm text-muted">Belum ada komentar.</p>
          ) : (
            <ul className="mt-4 space-y-4">
              {comments.map((comment) => (
                <li key={comment.id} className="flex gap-3">
                  <Avatar name={comment.user_name} />
                  <div className="min-w-0 flex-1 rounded-2xl bg-surface px-4 py-3 shadow-sm ring-1 ring-line">
                    <div className="flex flex-wrap items-center gap-2 text-sm">
                      <span className="font-semibold">{comment.user_name}</span>
                      <Badge>{ROLE_LABELS[comment.user_role]}</Badge>
                      <span className="text-xs text-muted">{formatDateTime(comment.created_at)}</span>
                      {user && (user.id === comment.user_id || user.role === 'super_admin') && (
                        <Button
                          variant="danger"
                          size="sm"
                          className="ml-auto"
                          aria-label="Hapus komentar"
                          disabled={remove.isPending}
                          onClick={() => confirm('Hapus komentar ini?') && remove.mutate(comment.id)}
                        >
                          <Trash2 className="size-4" aria-hidden />
                        </Button>
                      )}
                    </div>
                    <p className="mt-1 whitespace-pre-line">{comment.body}</p>
                  </div>
                </li>
              ))}
            </ul>
          )
        }
      </QueryView>
      {remove.isError && <ErrorNote error={remove.error} />}

      {user?.can_comment ? (
        <form onSubmit={handleSubmit(add.mutate)} className="mt-6 space-y-2">
          <label className="sr-only" htmlFor="comment-body">
            Tulis komentar
          </label>
          <textarea
            id="comment-body"
            required
            rows={3}
            maxLength={2000}
            placeholder="Tulis komentar…"
            value={body}
            onChange={(e) => setBody(e.target.value)}
            className={inputClass}
          />
          {add.isError && <ErrorNote error={add.error} />}
          <Button type="submit" size="sm" busy={add.isPending}>
            <Send className="size-4" aria-hidden /> Kirim
          </Button>
        </form>
      ) : (
        <p className="mt-6 text-sm text-muted">Komentar bisa ditulis oleh keluarga dan teman dekat.</p>
      )}
    </section>
  )
}
