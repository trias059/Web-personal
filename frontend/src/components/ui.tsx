import type { UseQueryResult } from '@tanstack/react-query'
import { LoaderCircle, type LucideIcon } from 'lucide-react'
import type { ButtonHTMLAttributes, ReactNode } from 'react'

import { errorMessage } from '../lib/api'
import { buttonClass, type ButtonVariant } from '../lib/styles'

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant
  size?: 'sm' | 'md'
  busy?: boolean
}

export function Button({ variant, size, busy, className = '', type = 'button', disabled, children, ...props }: ButtonProps) {
  return (
    <button type={type} className={`${buttonClass(variant, size)} ${className}`} disabled={disabled || busy} {...props}>
      {busy && <LoaderCircle className="size-4 animate-spin" aria-hidden />}
      {children}
    </button>
  )
}

export function Card({ className = '', children }: { className?: string; children: ReactNode }) {
  return <div className={`rounded-2xl border border-line bg-surface p-5 shadow-sm sm:p-6 ${className}`}>{children}</div>
}

export function Field({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return (
    <label className="block space-y-1.5">
      <span className="text-sm font-medium">{label}</span>
      {children}
      {hint && <span className="block text-xs text-muted">{hint}</span>}
    </label>
  )
}

export function Badge({ className = 'bg-sunken text-muted', children }: { className?: string; children: ReactNode }) {
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold ${className}`}>
      {children}
    </span>
  )
}

export function PageHeader(props: { icon?: LucideIcon; tint?: string; eyebrow?: string; title: string; description?: string; actions?: ReactNode }) {
  const { icon: Icon, tint, eyebrow, title, description, actions } = props
  return (
    <div className="mb-8 flex flex-wrap items-start gap-4">
      {Icon && (
        <span className={`grid size-12 shrink-0 place-items-center rounded-2xl ${tint}`}>
          <Icon className="size-6" aria-hidden />
        </span>
      )}
      <div className="min-w-0 flex-1">
        {eyebrow && <p className="text-xs font-semibold tracking-widest text-muted uppercase">{eyebrow}</p>}
        <h1 className="font-display text-3xl sm:text-4xl">{title}</h1>
        {description && <p className="mt-1 max-w-2xl text-muted">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  )
}

export function ErrorNote({ error }: { error: unknown }) {
  return (
    <p role="alert" className="rounded-xl bg-bad-soft px-3.5 py-2.5 text-sm text-bad">
      {errorMessage(error)}
    </p>
  )
}

export function Loading({ label = 'Memuat…' }: { label?: string }) {
  return (
    <p className="flex items-center gap-2 py-8 text-sm text-muted">
      <LoaderCircle className="size-4 animate-spin" aria-hidden /> {label}
    </p>
  )
}

export function EmptyState({ icon: Icon, title, children }: { icon: LucideIcon; title: string; children?: ReactNode }) {
  return (
    <div className="rounded-2xl border border-dashed border-line px-6 py-12 text-center">
      <Icon className="mx-auto size-8 text-muted" aria-hidden />
      <p className="mt-3 font-semibold">{title}</p>
      {children && <div className="mt-1 text-sm text-muted">{children}</div>}
    </div>
  )
}

/** Menampilkan status loading/error sebuah query, lalu konten saat data siap. */
export function QueryView<T>({ query, children }: { query: UseQueryResult<T>; children: (data: T) => ReactNode }) {
  if (query.isPending) return <Loading />
  if (query.isError) return <ErrorNote error={query.error} />
  return <>{children(query.data)}</>
}
