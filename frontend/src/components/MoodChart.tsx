import { useEffect, useId, useRef, useState, type KeyboardEvent, type PointerEvent, type RefObject } from 'react'

import { formatDate } from '../lib/format'
import { formatScore, MOOD_COLOR, moodLabel, type DayMood } from '../lib/mood'

const HEIGHT = 240
const PAD = { top: 14, right: 16, bottom: 30, left: 34 }
const Y_TICKS = [1, 0.5, 0, -0.5, -1]
const shortDate = new Intl.DateTimeFormat('id-ID', { day: 'numeric', month: 'short' })

const dayTime = (day: string) => new Date(`${day}T00:00:00`).getTime()

/**
 * Garis mood harian terhadap garis nol (netral). Area di atas nol diberi warna
 * positif, di bawahnya warna negatif; penanda tiap hari mengikuti labelnya.
 * Hover atau tombol panah menampilkan nilai; tabel data ada di bawah grafik.
 */
export default function MoodChart({ points }: { points: DayMood[] }) {
  const containerRef = useRef<HTMLDivElement>(null)
  const width = useElementWidth(containerRef)
  const [active, setActive] = useState<number | null>(null)
  const clipId = useId()

  const plotWidth = Math.max(0, width - PAD.left - PAD.right)
  const plotHeight = HEIGHT - PAD.top - PAD.bottom
  const first = dayTime(points[0].day)
  const last = dayTime(points[points.length - 1].day)
  const x = (day: string) => PAD.left + (last === first ? plotWidth / 2 : ((dayTime(day) - first) / (last - first)) * plotWidth)
  const y = (score: number) => PAD.top + ((1 - score) / 2) * plotHeight

  const line = points.map((p, i) => `${i === 0 ? 'M' : 'L'}${x(p.day)},${y(p.score)}`).join(' ')
  const area = `${line} L${x(points[points.length - 1].day)},${y(0)} L${x(points[0].day)},${y(0)} Z`
  const labelCount = Math.min(points.length, Math.max(2, Math.floor(plotWidth / 90)))
  const labelIndexes = [...new Set(Array.from({ length: labelCount }, (_, i) => Math.round((i * (points.length - 1)) / Math.max(1, labelCount - 1))))]

  const nearest = (event: PointerEvent<SVGRectElement>) => {
    const px = event.clientX - event.currentTarget.getBoundingClientRect().left + PAD.left
    let best = 0
    points.forEach((p, i) => {
      if (Math.abs(x(p.day) - px) < Math.abs(x(points[best].day) - px)) best = i
    })
    setActive(best)
  }
  const onKeyDown = (event: KeyboardEvent) => {
    if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return
    event.preventDefault()
    const step = event.key === 'ArrowLeft' ? -1 : 1
    setActive((i) => Math.min(points.length - 1, Math.max(0, (i ?? points.length - 1) + step)))
  }

  const point = active === null ? undefined : points[active]
  return (
    <div
      ref={containerRef}
      tabIndex={0}
      aria-label="Grafik mood harian. Gunakan panah kiri dan kanan untuk membaca nilai tiap hari."
      onKeyDown={onKeyDown}
      onFocus={() => setActive((i) => i ?? points.length - 1)}
      onBlur={() => setActive(null)}
      className="relative rounded-xl"
      style={{ height: HEIGHT }}
    >
      {width > 0 && (
        <svg width={width} height={HEIGHT} aria-hidden className="block">
          <defs>
            <clipPath id={`${clipId}-up`}>
              <rect x={0} y={0} width={width} height={y(0)} />
            </clipPath>
            <clipPath id={`${clipId}-down`}>
              <rect x={0} y={y(0)} width={width} height={HEIGHT - y(0)} />
            </clipPath>
          </defs>
          {Y_TICKS.map((tick) => (
            <g key={tick}>
              <line
                x1={PAD.left}
                x2={PAD.left + plotWidth}
                y1={y(tick)}
                y2={y(tick)}
                stroke={tick === 0 ? 'var(--color-muted)' : 'var(--color-line)'}
                strokeOpacity={tick === 0 ? 0.6 : 1}
              />
              {tick % 1 === 0 && (
                <text x={PAD.left - 8} y={y(tick)} dy="0.32em" textAnchor="end" className="fill-muted text-[11px] tabular-nums">
                  {tick > 0 ? '+1' : tick < 0 ? '−1' : '0'}
                </text>
              )}
            </g>
          ))}
          {points.length > 1 && (
            <>
              <path d={area} fill="var(--color-mood-up)" fillOpacity={0.12} clipPath={`url(#${clipId}-up)`} />
              <path d={area} fill="var(--color-mood-down)" fillOpacity={0.12} clipPath={`url(#${clipId}-down)`} />
              <path d={line} fill="none" stroke="var(--color-muted)" strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
            </>
          )}
          {point && (
            <line x1={x(point.day)} x2={x(point.day)} y1={PAD.top} y2={PAD.top + plotHeight} stroke="var(--color-muted)" strokeOpacity={0.5} />
          )}
          {points.map((p, i) => (
            <circle
              key={p.day}
              cx={x(p.day)}
              cy={y(p.score)}
              r={i === active ? 6 : 4}
              fill={MOOD_COLOR[moodLabel(p.score)]}
              stroke="var(--color-surface)"
              strokeWidth={2}
            />
          ))}
          {labelIndexes.map((i, n) => (
            <text
              key={points[i].day}
              x={x(points[i].day)}
              y={HEIGHT - 8}
              textAnchor={labelIndexes.length === 1 ? 'middle' : n === 0 ? 'start' : n === labelIndexes.length - 1 ? 'end' : 'middle'}
              className="fill-muted text-[11px] tabular-nums"
            >
              {shortDate.format(new Date(dayTime(points[i].day)))}
            </text>
          ))}
          <rect
            x={PAD.left}
            y={PAD.top}
            width={plotWidth}
            height={plotHeight}
            fill="transparent"
            onPointerMove={nearest}
            onPointerLeave={() => setActive(null)}
          />
        </svg>
      )}
      <div aria-live="polite" className="sr-only">
        {point && `${formatDate(point.day)}: mood ${formatScore(point.score)} (${moodLabel(point.score)}), ${point.count} entri`}
      </div>
      {point && (
        <div
          aria-hidden
          className="pointer-events-none absolute z-10 w-max -translate-x-1/2 rounded-xl border border-line bg-surface px-3 py-2 text-sm shadow-md"
          style={{
            left: Math.min(Math.max(x(point.day), 80), width - 80),
            top: Math.max(0, y(point.score) - 76),
          }}
        >
          <p className="font-semibold tabular-nums">
            {formatScore(point.score)} · {moodLabel(point.score)}
          </p>
          <p className="text-xs text-muted">
            {formatDate(point.day)} · {point.count} entri
          </p>
        </div>
      )}
    </div>
  )
}

function useElementWidth(ref: RefObject<HTMLElement | null>): number {
  const [width, setWidth] = useState(0)
  useEffect(() => {
    const element = ref.current
    if (!element) return
    const observer = new ResizeObserver(([entry]) => setWidth(entry.contentRect.width))
    observer.observe(element)
    return () => observer.disconnect()
  }, [ref])
  return width
}
