const buttonVariants = {
  primary: 'bg-accent text-on-accent hover:bg-accent-strong',
  secondary: 'border border-line bg-surface text-ink hover:bg-sunken',
  ghost: 'text-muted hover:bg-sunken hover:text-ink',
  danger: 'text-bad hover:bg-bad-soft',
}

export type ButtonVariant = keyof typeof buttonVariants

export function buttonClass(variant: ButtonVariant = 'primary', size: 'sm' | 'md' = 'md') {
  const sizing = size === 'sm' ? 'px-3 py-1.5 text-sm' : 'px-4 py-2.5 text-sm'
  return `inline-flex items-center justify-center gap-2 rounded-xl font-semibold transition disabled:cursor-not-allowed disabled:opacity-60 ${sizing} ${buttonVariants[variant]}`
}

export const inputClass =
  'w-full rounded-xl border border-line bg-surface px-3.5 py-2.5 text-sm text-ink placeholder:text-muted focus:border-accent focus:ring-2 focus:ring-accent/20 focus:outline-none'
