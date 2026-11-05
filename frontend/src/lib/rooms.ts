import { Database, GraduationCap, HeartHandshake, Images, NotebookPen, UserRound, type LucideIcon } from 'lucide-react'

import type { Role, RoomId, Track, Visibility } from './types'

export interface RoomInfo {
  id: RoomId
  path: string
  name: string
  /** Label pendek untuk navigasi. */
  nav: string
  /** Nama ruangan dalam metafora rumah. */
  place: string
  description: string
  /** Siapa yang bisa masuk; teks ini mengikuti aturan role di backend. */
  audience: string
  icon: LucideIcon
  tint: string
}

export const ROOMS: RoomInfo[] = [
  {
    id: 'biodata',
    path: '/biodata',
    name: 'Biodata',
    nav: 'Biodata',
    place: 'Ruang Tamu',
    description: 'Kenalan dulu: profil, keahlian, dan kontak.',
    audience: 'Terbuka untuk semua tamu',
    icon: UserRound,
    tint: 'bg-orange-100 text-orange-800 dark:bg-orange-950 dark:text-orange-200',
  },
  {
    id: 'learning',
    path: '/learning',
    name: 'Learning Room',
    nav: 'Learning',
    place: 'Ruang Belajar',
    description: 'Jalur Bahasa, Backend, dan AI dengan tutor AI, kuis, dan flashcard.',
    audience: 'Khusus pemilik rumah',
    icon: GraduationCap,
    tint: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-950 dark:text-indigo-200',
  },
  {
    id: 'vlog',
    path: '/vlog',
    name: 'Daily Vlog',
    nav: 'Vlog',
    place: 'Teras',
    description: 'Cerita harian lengkap dengan foto dan video.',
    audience: 'Teman, teman dekat, dan keluarga',
    icon: NotebookPen,
    tint: 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-200',
  },
  {
    id: 'curhat',
    path: '/curhat',
    name: 'Curhat Room',
    nav: 'Curhat',
    place: 'Kamar',
    description: 'Jurnal pribadi, teman curhat AI, dan grafik mood.',
    audience: 'Khusus pemilik rumah',
    icon: HeartHandshake,
    tint: 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-200',
  },
  {
    id: 'kenangan',
    path: '/kenangan',
    name: 'Kenangan',
    nav: 'Kenangan',
    place: 'Loteng',
    description: 'Galeri foto dan catatan momen yang ingin diingat.',
    audience: 'Teman dekat dan keluarga',
    icon: Images,
    tint: 'bg-teal-100 text-teal-800 dark:bg-teal-950 dark:text-teal-200',
  },
  {
    id: 'data',
    path: '/data',
    name: 'Data Management',
    nav: 'Data',
    place: 'Ruang Kendali',
    description: 'Kelola pengguna, role, dan semua isi rumah.',
    audience: 'Khusus pemilik rumah',
    icon: Database,
    tint: 'bg-stone-200 text-stone-800 dark:bg-stone-800 dark:text-stone-200',
  },
]

export const roomById = (id: RoomId) => ROOMS.find((room) => room.id === id)!

/** Pengunjung tanpa login hanya bisa membuka Biodata; untuk pengguna login, daftar room datang dari backend. */
export const PUBLIC_ROOMS: RoomId[] = ['biodata']

export const ROLE_LABELS: Record<Role, string> = {
  super_admin: 'Pemilik',
  keluarga: 'Keluarga',
  teman_dekat: 'Teman dekat',
  teman: 'Teman',
}

export const VISIBILITY_INFO: Record<Visibility, { label: string; hint: string }> = {
  private: { label: 'Privat', hint: 'Hanya kamu dan keluarga' },
  shared: { label: 'Shared', hint: 'Keluarga dan teman dekat' },
  public: { label: 'Publik', hint: 'Semua yang bisa membuka room ini' },
}

export const TRACKS: { id: Track; name: string; description: string }[] = [
  { id: 'bahasa', name: 'Bahasa', description: 'Kosakata, grammar, dan latihan percakapan.' },
  { id: 'backend', name: 'Backend', description: 'Go, API, database, dan arsitektur server.' },
  { id: 'ai', name: 'AI', description: 'Machine learning, LLM, dan NLP.' },
]
