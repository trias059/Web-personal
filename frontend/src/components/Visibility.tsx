import { Globe, Lock, Users } from 'lucide-react'
import { useId } from 'react'

import { VISIBILITY_INFO } from '../lib/rooms'
import type { Visibility } from '../lib/types'
import { Badge } from './ui'

const VISIBILITIES: Visibility[] = ['private', 'shared', 'public']
const ICONS = { private: Lock, shared: Users, public: Globe }

export function VisibilityBadge({ value }: { value: Visibility }) {
  const Icon = ICONS[value]
  return (
    <Badge>
      <Icon className="size-3" aria-hidden /> {VISIBILITY_INFO[value].label}
    </Badge>
  )
}

export function VisibilityPicker({ value, onChange }: { value: Visibility; onChange: (value: Visibility) => void }) {
  const name = useId()
  return (
    <fieldset>
      <legend className="text-sm font-medium">Siapa yang boleh melihat?</legend>
      <div className="mt-1.5 grid gap-2 sm:grid-cols-3">
        {VISIBILITIES.map((v) => {
          const Icon = ICONS[v]
          return (
            <label
              key={v}
              className={`cursor-pointer rounded-xl border px-3 py-2 text-sm transition has-focus-visible:ring-2 has-focus-visible:ring-accent ${
                value === v ? 'border-accent bg-accent-soft' : 'border-line hover:bg-sunken'
              }`}
            >
              <input type="radio" name={name} className="sr-only" checked={value === v} onChange={() => onChange(v)} />
              <span className="flex items-center gap-1.5 font-semibold">
                <Icon className="size-3.5" aria-hidden /> {VISIBILITY_INFO[v].label}
              </span>
              <span className="block text-xs text-muted">{VISIBILITY_INFO[v].hint}</span>
            </label>
          )
        })}
      </div>
    </fieldset>
  )
}
