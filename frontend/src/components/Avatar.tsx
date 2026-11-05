import { useState } from 'react'

const sizes = {
  sm: 'size-9 text-sm',
  lg: 'size-32 text-4xl sm:size-40',
}

/** Foto profil; jika kosong atau gagal dimuat, tampilkan inisial nama. */
export default function Avatar({ name, src, size = 'sm' }: { name: string; src?: string; size?: keyof typeof sizes }) {
  const [brokenSrc, setBrokenSrc] = useState<string>()
  const initials = name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word[0].toUpperCase())
    .join('')

  if (src && src !== brokenSrc) {
    return (
      <img
        src={src}
        alt={`Foto ${name}`}
        onError={() => setBrokenSrc(src)}
        className={`${sizes[size]} shrink-0 rounded-full object-cover ring-4 ring-accent-soft`}
      />
    )
  }
  return (
    <span
      aria-hidden
      className={`${sizes[size]} grid shrink-0 place-items-center rounded-full bg-accent-soft font-display text-accent`}
    >
      {initials}
    </span>
  )
}
