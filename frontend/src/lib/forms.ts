import type { FormEvent } from 'react'

/** Handler onSubmit yang mencegah reload halaman lalu menjalankan aksi. */
export function handleSubmit(action: () => void) {
  return (event: FormEvent) => {
    event.preventDefault()
    action()
  }
}
