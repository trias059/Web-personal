import { useMutation } from '@tanstack/react-query'
import { House } from 'lucide-react'
import { useState, type ReactNode } from 'react'
import { Link, Navigate, useSearchParams } from 'react-router'

import { Button, Card, ErrorNote, Field } from '../components/ui'
import { login, register } from '../lib/api'
import { handleSubmit } from '../lib/forms'
import { inputClass } from '../lib/styles'
import { useAuth } from '../store/auth'

export function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const mutation = useMutation({ mutationFn: () => login(email.trim(), password) })

  return (
    <AuthCard title="Masuk ke rumah" subtitle="Gunakan akun yang sudah terdaftar.">
      <form onSubmit={handleSubmit(mutation.mutate)} className="space-y-4">
        <Field label="Email">
          <input type="email" required autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} className={inputClass} />
        </Field>
        <Field label="Password">
          <input
            type="password"
            required
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className={inputClass}
          />
        </Field>
        {mutation.isError && <ErrorNote error={mutation.error} />}
        <Button type="submit" busy={mutation.isPending} className="w-full">
          Masuk
        </Button>
      </form>
      <p className="mt-6 text-center text-sm text-muted">
        Belum punya akun?{' '}
        <Link to="/register" className="font-semibold text-accent hover:underline">
          Daftar
        </Link>
      </p>
    </AuthCard>
  )
}

export function Register() {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const mutation = useMutation({ mutationFn: () => register(name.trim(), email.trim(), password) })

  return (
    <AuthCard title="Buat akun tamu" subtitle="Akun baru berperan sebagai Teman. Pemilik rumah bisa membuka lebih banyak ruangan untukmu.">
      <form onSubmit={handleSubmit(mutation.mutate)} className="space-y-4">
        <Field label="Nama">
          <input required maxLength={100} autoComplete="name" value={name} onChange={(e) => setName(e.target.value)} className={inputClass} />
        </Field>
        <Field label="Email">
          <input type="email" required autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} className={inputClass} />
        </Field>
        <Field label="Password" hint="Minimal 8 karakter.">
          <input
            type="password"
            required
            minLength={8}
            maxLength={72}
            autoComplete="new-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className={inputClass}
          />
        </Field>
        {mutation.isError && <ErrorNote error={mutation.error} />}
        <Button type="submit" busy={mutation.isPending} className="w-full">
          Daftar
        </Button>
      </form>
      <p className="mt-6 text-center text-sm text-muted">
        Sudah punya akun?{' '}
        <Link to="/login" className="font-semibold text-accent hover:underline">
          Masuk
        </Link>
      </p>
    </AuthCard>
  )
}

/** Kartu formulir auth; pengguna yang sudah login langsung diarahkan ke tujuan (?next=). */
function AuthCard({ title, subtitle, children }: { title: string; subtitle: string; children: ReactNode }) {
  const user = useAuth((s) => s.user)
  const [params] = useSearchParams()
  if (user) return <Navigate to={safeNext(params.get('next'))} replace />

  return (
    <div className="mx-auto max-w-md py-6">
      <Card>
        <span className="grid size-11 place-items-center rounded-xl bg-accent text-on-accent">
          <House className="size-5" aria-hidden />
        </span>
        <h1 className="mt-4 font-display text-3xl">{title}</h1>
        <p className="mt-1 mb-6 text-sm text-muted">{subtitle}</p>
        {children}
      </Card>
    </div>
  )
}

// Hanya path internal yang diterima agar ?next= tidak bisa dipakai redirect ke situs lain.
function safeNext(next: string | null): string {
  return next?.startsWith('/') && !next.startsWith('//') ? next : '/'
}
