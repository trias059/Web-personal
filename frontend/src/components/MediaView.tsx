import { ExternalLink, ImageOff, Play } from 'lucide-react'
import { useState } from 'react'

import { detectMedia } from '../lib/media'

/**
 * full: media utuh (video bisa diputar) untuk halaman detail dan feed.
 * cover: gambar sampul 4:3 untuk kartu galeri (kartu sudah berupa tautan, jadi
 * cover tidak pernah merender tautan sendiri).
 */
export default function MediaView({ url, alt, variant = 'full' }: { url: string; alt: string; variant?: 'full' | 'cover' }) {
  const [brokenUrl, setBrokenUrl] = useState<string>()
  const media = detectMedia(url)

  if (brokenUrl === url && variant === 'cover') {
    return (
      <div className="grid aspect-[4/3] place-items-center bg-sunken text-muted">
        <ImageOff className="size-8" aria-label="Media tidak bisa dimuat" />
      </div>
    )
  }
  if (brokenUrl === url) {
    return (
      <a
        href={url}
        target="_blank"
        rel="noreferrer"
        className="flex items-center gap-2 rounded-xl bg-sunken px-4 py-3 text-sm font-medium text-accent hover:underline"
      >
        <ExternalLink className="size-4" aria-hidden /> Buka media
      </a>
    )
  }

  if (variant === 'cover') {
    const src = media.kind === 'youtube' ? media.thumbnail : media.src
    if (media.kind === 'video') {
      return (
        <div className="grid aspect-[4/3] place-items-center bg-sunken text-muted">
          <Play className="size-8" aria-label="Video" />
        </div>
      )
    }
    return (
      <div className="relative aspect-[4/3] overflow-hidden bg-sunken">
        <img src={src} alt={alt} loading="lazy" onError={() => setBrokenUrl(url)} className="size-full object-cover" />
        {media.kind === 'youtube' && (
          <span className="absolute inset-0 grid place-items-center">
            <span className="grid size-12 place-items-center rounded-full bg-black/60 text-white">
              <Play className="size-5" aria-label="Video YouTube" />
            </span>
          </span>
        )}
      </div>
    )
  }

  if (media.kind === 'youtube') {
    return (
      <div className="aspect-video overflow-hidden rounded-xl bg-sunken">
        <iframe
          src={media.src}
          title={alt}
          className="size-full"
          allow="accelerometer; encrypted-media; gyroscope; picture-in-picture"
          referrerPolicy="strict-origin-when-cross-origin"
          allowFullScreen
          loading="lazy"
        />
      </div>
    )
  }
  if (media.kind === 'video') {
    return <video src={media.src} controls preload="metadata" className="w-full rounded-xl bg-black" />
  }
  return (
    <img
      src={media.src}
      alt={alt}
      loading="lazy"
      onError={() => setBrokenUrl(url)}
      className="max-h-[36rem] w-full rounded-xl bg-sunken object-contain"
    />
  )
}
