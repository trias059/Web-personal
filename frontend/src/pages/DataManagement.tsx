import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ArrowRight, Trash2 } from 'lucide-react'
import { Link } from 'react-router'

import ProgressBar from '../components/ProgressBar'
import { Badge, Button, Card, ErrorNote, PageHeader, QueryView } from '../components/ui'
import { api } from '../lib/api'
import { formatDate, formatDateTime } from '../lib/format'
import { ROLE_LABELS, roomById, TRACKS } from '../lib/rooms'
import { fieldClass } from '../lib/styles'
import type { Comment, Role, Stats, User } from '../lib/types'

const ADMIN_KEY = ['admin']
const ASSIGNABLE_ROLES: Role[] = ['keluarga', 'teman_dekat', 'teman']

/** Tiap jenis record dikelola di room-nya sendiri; dashboard ini menghitung dan menautkannya. */
const RECORDS: { key: string; label: string; path: string }[] = [
  { key: 'learning_items', label: 'Materi belajar', path: '/learning' },
  { key: 'flashcards', label: 'Flashcard', path: '/learning/review' },
  { key: 'vlog_posts', label: 'Vlog', path: '/vlog' },
  { key: 'memories', label: 'Kenangan', path: '/kenangan' },
  { key: 'curhat_entries', label: 'Entri curhat', path: '/curhat' },
  { key: 'profile_details', label: 'Detail biodata', path: '/biodata' },
]

export default function DataManagement() {
  const room = roomById('data')
  const stats = useQuery({ queryKey: [...ADMIN_KEY, 'stats'], queryFn: () => api<Stats>('/admin/stats') })

  return (
    <>
      <PageHeader
        icon={room.icon}
        tint={room.tint}
        eyebrow={room.place}
        title={room.name}
        description="Ringkasan isi rumah, pengaturan peran tamu, dan moderasi komentar."
      />
      <div className="space-y-10">
        <QueryView query={stats}>
          {(s) => (
            <section className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_22rem]">
              <dl className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                {RECORDS.map((record) => (
                  <Link
                    key={record.key}
                    to={record.path}
                    className="group rounded-2xl border border-line bg-surface p-4 shadow-sm transition hover:border-accent/50"
                  >
                    <dt className="text-sm text-muted">{record.label}</dt>
                    <dd className="mt-1 text-3xl font-semibold">{s.records[record.key] ?? 0}</dd>
                    <span className="mt-2 flex items-center gap-1 text-xs font-semibold text-accent">
                      Kelola <ArrowRight className="size-3.5 transition group-hover:translate-x-0.5" aria-hidden />
                    </span>
                  </Link>
                ))}
              </dl>
              <Card>
                <h2 className="font-semibold">Progres belajar</h2>
                <ul className="mt-4 space-y-4">
                  {TRACKS.map((track) => {
                    const stat = s.tracks.find((t) => t.track === track.id)
                    const avg = Math.round(stat?.avg_progress ?? 0)
                    return (
                      <li key={track.id}>
                        <div className="mb-1.5 flex justify-between text-sm">
                          <span className="font-medium">{track.name}</span>
                          <span className="text-muted tabular-nums">
                            {stat?.items ?? 0} materi · {avg}%
                          </span>
                        </div>
                        <ProgressBar value={avg} label={`Rata-rata progres ${track.name}`} />
                      </li>
                    )
                  })}
                </ul>
                <p className="mt-5 text-sm text-muted">
                  Komentar: <span className="font-semibold text-ink">{s.records.comments ?? 0}</span>
                </p>
              </Card>
            </section>
          )}
        </QueryView>
        <UsersSection />
        <CommentsSection />
      </div>
    </>
  )
}

function UsersSection() {
  const queryClient = useQueryClient()
  const query = useQuery({ queryKey: [...ADMIN_KEY, 'users'], queryFn: () => api<User[]>('/admin/users') })
  const refresh = () => queryClient.invalidateQueries({ queryKey: ADMIN_KEY })
  const changeRole = useMutation({
    mutationFn: ({ id, role }: { id: number; role: Role }) => api(`/admin/users/${id}`, 'PATCH', { role }),
    onSuccess: refresh,
  })
  const remove = useMutation({ mutationFn: (id: number) => api(`/admin/users/${id}`, 'DELETE'), onSuccess: refresh })

  return (
    <section>
      <h2 className="text-lg font-semibold">Pengguna & peran</h2>
      <p className="mt-1 text-sm text-muted">
        Akun baru berperan Teman. Naikkan ke Teman dekat atau Keluarga untuk membuka Kenangan dan konten shared/privat.
      </p>
      {(changeRole.isError || remove.isError) && (
        <div className="mt-3">
          <ErrorNote error={changeRole.error ?? remove.error} />
        </div>
      )}
      <QueryView query={query}>
        {(users) => (
          <div className="mt-4 overflow-x-auto rounded-2xl border border-line bg-surface shadow-sm">
            <table className="w-full min-w-[40rem] text-left text-sm">
              <thead className="border-b border-line text-muted">
                <tr>
                  <th className="px-4 py-3 font-medium">Nama</th>
                  <th className="px-4 py-3 font-medium">Email</th>
                  <th className="px-4 py-3 font-medium">Peran</th>
                  <th className="px-4 py-3 font-medium">Bergabung</th>
                  <th className="px-4 py-3">
                    <span className="sr-only">Aksi</span>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {users.map((user) => (
                  <tr key={user.id}>
                    <td className="px-4 py-3 font-medium">{user.name}</td>
                    <td className="px-4 py-3 text-muted">{user.email}</td>
                    <td className="px-4 py-3">
                      {user.role === 'super_admin' ? (
                        <Badge className="bg-accent-soft text-accent">{ROLE_LABELS.super_admin}</Badge>
                      ) : (
                        <select
                          aria-label={`Peran ${user.name}`}
                          value={user.role}
                          disabled={changeRole.isPending}
                          onChange={(e) => changeRole.mutate({ id: user.id, role: e.target.value as Role })}
                          className={`${fieldClass} py-1.5`}
                        >
                          {ASSIGNABLE_ROLES.map((role) => (
                            <option key={role} value={role}>
                              {ROLE_LABELS[role]}
                            </option>
                          ))}
                        </select>
                      )}
                    </td>
                    <td className="px-4 py-3 text-muted">{formatDate(user.created_at)}</td>
                    <td className="px-4 py-3 text-right">
                      {user.role !== 'super_admin' && (
                        <Button
                          variant="danger"
                          size="sm"
                          aria-label={`Hapus ${user.name}`}
                          disabled={remove.isPending}
                          onClick={() => confirm(`Hapus akun ${user.name} beserta komentarnya?`) && remove.mutate(user.id)}
                        >
                          <Trash2 className="size-4" aria-hidden />
                        </Button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </QueryView>
    </section>
  )
}

function CommentsSection() {
  const queryClient = useQueryClient()
  const query = useQuery({ queryKey: [...ADMIN_KEY, 'comments'], queryFn: () => api<Comment[]>('/admin/comments') })
  const remove = useMutation({
    mutationFn: (id: number) => api(`/comments/${id}`, 'DELETE'),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ADMIN_KEY }),
  })

  return (
    <section>
      <h2 className="text-lg font-semibold">Komentar terbaru</h2>
      {remove.isError && (
        <div className="mt-3">
          <ErrorNote error={remove.error} />
        </div>
      )}
      <QueryView query={query}>
        {(comments) =>
          comments.length === 0 ? (
            <p className="mt-2 text-sm text-muted">Belum ada komentar.</p>
          ) : (
            <ul className="mt-4 divide-y divide-line rounded-2xl border border-line bg-surface shadow-sm">
              {comments.map((comment) => {
                const target = comment.target_type === 'vlog' ? '/vlog' : '/kenangan'
                return (
                  <li key={comment.id} className="flex items-start gap-3 px-4 py-3">
                    <div className="min-w-0 flex-1 text-sm">
                      <p className="flex flex-wrap items-center gap-2">
                        <span className="font-semibold">{comment.user_name}</span>
                        <Badge>{ROLE_LABELS[comment.user_role]}</Badge>
                        <span className="text-xs text-muted">{formatDateTime(comment.created_at)}</span>
                        <Link to={`${target}/${comment.target_id}`} className="text-xs font-semibold text-accent hover:underline">
                          {comment.target_type === 'vlog' ? 'Vlog' : 'Kenangan'} #{comment.target_id}
                        </Link>
                      </p>
                      <p className="mt-1 line-clamp-2">{comment.body}</p>
                    </div>
                    <Button
                      variant="danger"
                      size="sm"
                      aria-label="Hapus komentar"
                      disabled={remove.isPending}
                      onClick={() => confirm('Hapus komentar ini?') && remove.mutate(comment.id)}
                    >
                      <Trash2 className="size-4" aria-hidden />
                    </Button>
                  </li>
                )
              })}
            </ul>
          )
        }
      </QueryView>
    </section>
  )
}
