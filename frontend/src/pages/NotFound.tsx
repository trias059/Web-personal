import { DoorClosed } from 'lucide-react'
import { Link } from 'react-router'

import { buttonClass } from '../lib/styles'

export default function NotFound() {
  return (
    <div className="mx-auto max-w-md py-16 text-center">
      <DoorClosed className="mx-auto size-10 text-muted" aria-hidden />
      <h1 className="mt-4 font-display text-3xl">Ruangan tidak ditemukan</h1>
      <p className="mt-2 text-muted">Pintu yang kamu cari tidak ada di rumah ini.</p>
      <Link to="/" className={`${buttonClass('secondary')} mt-6`}>
        Kembali ke beranda
      </Link>
    </div>
  )
}
