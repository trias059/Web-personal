import { useAuth } from '../store/auth'
import type { Session, SessionUser } from './types'

const API_URL = (import.meta.env.VITE_API_URL || 'http://localhost:8080').replace(/\/+$/, '')

export class ApiError extends Error {
  readonly status: number

  constructor(status: number, message: string) {
    super(message)
    this.status = status
  }
}

type Method = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'

export async function api<T>(path: string, method: Method = 'GET', body?: unknown): Promise<T> {
  const { token, logout } = useAuth.getState()
  let res: Response
  try {
    res = await fetch(`${API_URL}/api${path}`, {
      method,
      headers: {
        ...(body === undefined ? {} : { 'Content-Type': 'application/json' }),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: body === undefined ? undefined : JSON.stringify(body),
    })
  } catch {
    throw new ApiError(0, 'Tidak bisa terhubung ke server. Periksa koneksi atau VITE_API_URL.')
  }

  // Token kedaluwarsa atau akun dihapus: keluarkan pengguna agar tidak terjebak.
  if (res.status === 401 && token) logout()
  if (!res.ok) {
    const data = (await res.json().catch(() => null)) as { error?: string } | null
    throw new ApiError(res.status, data?.error ?? `Permintaan gagal (${res.status})`)
  }
  return (res.status === 204 ? undefined : await res.json()) as T
}

export function errorMessage(err: unknown): string {
  return err instanceof Error ? err.message : 'Terjadi kesalahan'
}

export async function login(email: string, password: string) {
  useAuth.getState().setSession(await api<Session>('/auth/login', 'POST', { email, password }))
}

export async function register(name: string, email: string, password: string) {
  useAuth.getState().setSession(await api<Session>('/auth/register', 'POST', { name, email, password }))
}

// refreshSession mengambil role terbaru; pemilik bisa mengubah role kapan saja.
export async function refreshSession(): Promise<SessionUser> {
  const { user } = await api<{ user: SessionUser }>('/auth/me')
  useAuth.getState().setUser(user)
  return user
}
