export type Media =
  | { kind: 'youtube'; src: string; thumbnail: string }
  | { kind: 'video'; src: string }
  | { kind: 'image'; src: string }

const VIDEO_EXTENSION = /\.(mp4|mov|ogg|webm)$/i

/**
 * Menentukan cara menampilkan media_url. URL selain YouTube dan file video dicoba
 * sebagai gambar (banyak URL gambar tidak berakhiran .jpg); MediaView menampilkan
 * tautan biasa jika gambar gagal dimuat.
 */
export function detectMedia(url: string): Media {
  let parsed: URL
  try {
    parsed = new URL(url)
  } catch {
    return { kind: 'image', src: url }
  }
  const host = parsed.hostname.replace(/^(www|m)\./, '')
  const youtubeId =
    host === 'youtu.be'
      ? parsed.pathname.slice(1)
      : host === 'youtube.com'
        ? (parsed.searchParams.get('v') ?? parsed.pathname.match(/^\/(?:shorts|embed|live)\/([^/]+)/)?.[1])
        : undefined
  if (youtubeId && /^[\w-]+$/.test(youtubeId)) {
    return {
      kind: 'youtube',
      src: `https://www.youtube-nocookie.com/embed/${youtubeId}`,
      thumbnail: `https://i.ytimg.com/vi/${youtubeId}/hqdefault.jpg`,
    }
  }
  if (VIDEO_EXTENSION.test(parsed.pathname)) return { kind: 'video', src: url }
  return { kind: 'image', src: url }
}

/** Nilai biodata yang berupa URL/email ditampilkan sebagai tautan. */
export function linkFor(value: string): string | undefined {
  if (/^https?:\/\/\S+$/i.test(value)) return value
  if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) return `mailto:${value}`
  return undefined
}
