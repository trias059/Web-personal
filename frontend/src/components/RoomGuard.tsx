import { Lock } from 'lucide-react'
import { Link, Navigate, Outlet, useLocation } from 'react-router'

import { PUBLIC_ROOMS, roomById } from '../lib/rooms'
import { buttonClass } from '../lib/styles'
import type { RoomId } from '../lib/types'
import { useAuth } from '../store/auth'

/** Melindungi route room di frontend; backend tetap memeriksa ulang setiap request. */
export default function RoomGuard({ room }: { room: RoomId }) {
  const user = useAuth((s) => s.user)
  const location = useLocation()

  if ((user?.rooms ?? PUBLIC_ROOMS).includes(room)) return <Outlet />
  if (!user) {
    return <Navigate to={`/login?next=${encodeURIComponent(location.pathname + location.search)}`} replace />
  }

  const info = roomById(room)
  return (
    <div className="mx-auto max-w-md py-16 text-center">
      <span className="mx-auto grid size-14 place-items-center rounded-2xl bg-sunken text-muted">
        <Lock className="size-6" aria-hidden />
      </span>
      <h1 className="mt-4 font-display text-2xl">{info.name} masih terkunci</h1>
      <p className="mt-2 text-muted">
        Ruangan ini untuk: {info.audience.toLowerCase()}. Minta pemilik rumah menaikkan peranmu jika perlu akses.
      </p>
      <Link to="/" className={`${buttonClass('secondary')} mt-6`}>
        Kembali ke beranda
      </Link>
    </div>
  )
}
