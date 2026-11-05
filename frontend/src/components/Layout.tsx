import { useQuery } from '@tanstack/react-query'
import { House, LogIn, LogOut, Menu, X } from 'lucide-react'
import { useState } from 'react'
import { Link, NavLink, Outlet } from 'react-router'

import { refreshSession } from '../lib/api'
import { PUBLIC_ROOMS, ROLE_LABELS, ROOMS } from '../lib/rooms'
import { buttonClass } from '../lib/styles'
import { useAuth } from '../store/auth'
import { Badge } from './ui'

export default function Layout() {
  const { token, user, logout } = useAuth()
  const [menuOpen, setMenuOpen] = useState(false)
  // Role bisa berubah kapan saja lewat Data Management, jadi sesi disegarkan saat app dibuka.
  useQuery({ queryKey: ['session', token], queryFn: refreshSession, enabled: token !== null })

  const rooms = ROOMS.filter((room) => (user?.rooms ?? PUBLIC_ROOMS).includes(room.id))
  const closeMenu = () => setMenuOpen(false)
  const navClass = ({ isActive }: { isActive: boolean }) =>
    `flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium whitespace-nowrap transition ${
      isActive ? 'bg-sunken text-ink' : 'text-muted hover:text-ink'
    }`
  const links = rooms.map((room) => (
    <NavLink key={room.id} to={room.path} onClick={closeMenu} className={navClass}>
      <room.icon className="size-4" aria-hidden /> {room.nav}
    </NavLink>
  ))

  return (
    <div className="flex min-h-svh flex-col">
      <header className="sticky top-0 z-20 border-b border-line bg-paper/90 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center gap-3 px-4 py-3 sm:px-6">
          <Link to="/" onClick={closeMenu} className="flex items-center gap-2.5">
            <span className="grid size-9 place-items-center rounded-xl bg-accent text-on-accent">
              <House className="size-5" aria-hidden />
            </span>
            <span className="leading-tight">
              <span className="block font-display text-lg">Rumah Digital</span>
              <span className="block text-xs text-muted">Trias Aji Lomanto</span>
            </span>
          </Link>

          <nav aria-label="Ruangan" className="ml-4 hidden flex-1 items-center gap-1 lg:flex">
            {links}
          </nav>

          <div className="ml-auto flex items-center gap-2">
            {user ? (
              <>
                <span className="hidden text-right text-sm leading-tight sm:block">
                  <span className="block font-semibold">{user.name}</span>
                  <Badge className="bg-accent-soft text-accent">{ROLE_LABELS[user.role]}</Badge>
                </span>
                <button type="button" onClick={logout} className={buttonClass('ghost', 'sm')}>
                  <LogOut className="size-4" aria-hidden /> <span className="hidden sm:inline">Keluar</span>
                </button>
              </>
            ) : (
              <Link to="/login" className={buttonClass('primary', 'sm')}>
                <LogIn className="size-4" aria-hidden /> Masuk
              </Link>
            )}
            <button
              type="button"
              onClick={() => setMenuOpen((open) => !open)}
              aria-expanded={menuOpen}
              aria-label={menuOpen ? 'Tutup menu' : 'Buka menu'}
              className={`${buttonClass('ghost', 'sm')} lg:hidden`}
            >
              {menuOpen ? <X className="size-5" aria-hidden /> : <Menu className="size-5" aria-hidden />}
            </button>
          </div>
        </div>
        {menuOpen && (
          <nav aria-label="Ruangan" className="mx-auto grid max-w-6xl gap-1 border-t border-line px-4 py-3 sm:grid-cols-2 lg:hidden">
            {user && (
              <p className="mb-1 flex items-center gap-2 px-3 text-sm sm:col-span-2">
                <span className="font-semibold">{user.name}</span>
                <Badge className="bg-accent-soft text-accent">{ROLE_LABELS[user.role]}</Badge>
              </p>
            )}
            {links}
          </nav>
        )}
      </header>

      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8 sm:px-6 sm:py-10">
        <Outlet />
      </main>

      <footer className="border-t border-line py-6 text-center text-sm text-muted">
        Rumah Digital · Trias Aji Lomanto
      </footer>
    </div>
  )
}
