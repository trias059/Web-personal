import { useQuery } from '@tanstack/react-query'
import { ArrowRight, Lock } from 'lucide-react'
import { Link } from 'react-router'

import Avatar from '../components/Avatar'
import { ErrorNote } from '../components/ui'
import { api } from '../lib/api'
import { PUBLIC_ROOMS, ROLE_LABELS, ROOMS, type RoomInfo } from '../lib/rooms'
import { buttonClass } from '../lib/styles'
import type { ProfileResponse } from '../lib/types'
import { useAuth } from '../store/auth'

export default function Landing() {
  const user = useAuth((s) => s.user)
  const query = useQuery({ queryKey: ['profile'], queryFn: () => api<ProfileResponse>('/profile') })
  const profile = query.data?.profile
  const name = profile?.full_name ?? 'Trias Aji Lomanto'
  const openRooms = user?.rooms ?? PUBLIC_ROOMS

  return (
    <div className="space-y-14">
      <section className="grid items-center gap-8 rounded-3xl border border-line bg-surface p-6 shadow-sm sm:p-10 md:grid-cols-[auto_1fr]">
        <Avatar name={name} src={profile?.photo_url} size="lg" />
        <div>
          <p className="text-xs font-semibold tracking-widest text-accent uppercase">Selamat datang di rumah digital</p>
          <h1 className="mt-2 font-display text-4xl sm:text-5xl">{name}</h1>
          {profile?.headline && <p className="mt-2 text-lg text-muted">{profile.headline}</p>}
          {profile?.bio && <p className="mt-4 line-clamp-3 max-w-2xl whitespace-pre-line">{profile.bio}</p>}
          <div className="mt-6 flex flex-wrap items-center gap-3">
            <Link to="/biodata" className={buttonClass('primary')}>
              Lihat biodata <ArrowRight className="size-4" aria-hidden />
            </Link>
            {user ? (
              <p className="text-sm text-muted">
                Halo, {user.name}! Kamu masuk sebagai <strong className="text-ink">{ROLE_LABELS[user.role]}</strong>.
              </p>
            ) : (
              <Link to="/login" className={buttonClass('secondary')}>
                Masuk
              </Link>
            )}
          </div>
          {query.isError && (
            <div className="mt-4">
              <ErrorNote error={query.error} />
            </div>
          )}
        </div>
      </section>

      <section>
        <h2 className="font-display text-2xl sm:text-3xl">Ruangan di rumah ini</h2>
        <p className="mt-1 text-muted">Setiap ruangan punya pintunya sendiri dan terbuka sesuai peranmu.</p>
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {ROOMS.map((room) => (
            <RoomCard key={room.id} room={room} open={openRooms.includes(room.id)} />
          ))}
        </div>
      </section>
    </div>
  )
}

function RoomCard({ room, open }: { room: RoomInfo; open: boolean }) {
  const body = (
    <>
      <div className="flex items-start justify-between gap-3">
        <span className={`grid size-11 place-items-center rounded-xl ${room.tint}`}>
          <room.icon className="size-5" aria-hidden />
        </span>
        {!open && <Lock className="size-4 text-muted" aria-label="Terkunci" />}
      </div>
      <p className="mt-4 text-xs font-semibold tracking-widest text-muted uppercase">{room.place}</p>
      <h3 className="text-lg font-semibold">{room.name}</h3>
      <p className="mt-1 text-sm text-muted">{room.description}</p>
      <p className={`mt-4 flex items-center gap-1 text-sm font-semibold ${open ? 'text-accent' : 'text-muted'}`}>
        {open ? (
          <>
            Masuk <ArrowRight className="size-4 transition group-hover:translate-x-0.5" aria-hidden />
          </>
        ) : (
          room.audience
        )}
      </p>
    </>
  )
  const base = 'group rounded-2xl border border-line bg-surface p-5 shadow-sm transition'
  return open ? (
    <Link to={room.path} className={`${base} hover:-translate-y-0.5 hover:border-accent/50 hover:shadow-md`}>
      {body}
    </Link>
  ) : (
    <div className={`${base} opacity-75`}>{body}</div>
  )
}
