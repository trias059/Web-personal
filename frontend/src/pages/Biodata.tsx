import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Pencil, Plus, Trash2 } from 'lucide-react'
import { useState, type ChangeEvent } from 'react'

import Avatar from '../components/Avatar'
import { Button, Card, ErrorNote, Field, PageHeader, QueryView } from '../components/ui'
import { VisibilityBadge, VisibilityPicker } from '../components/Visibility'
import { api } from '../lib/api'
import { handleSubmit } from '../lib/forms'
import { linkFor } from '../lib/media'
import { roomById } from '../lib/rooms'
import { inputClass } from '../lib/styles'
import type { Profile, ProfileDetail, ProfileResponse, Visibility } from '../lib/types'
import { useIsOwner } from '../store/auth'

const profileKey = ['profile']

export default function Biodata() {
  const isOwner = useIsOwner()
  const query = useQuery({ queryKey: profileKey, queryFn: () => api<ProfileResponse>('/profile') })
  const room = roomById('biodata')

  return (
    <>
      <PageHeader
        icon={room.icon}
        tint={room.tint}
        eyebrow={room.place}
        title="Biodata"
        description={
          isOwner
            ? 'Profil utama selalu publik. Atur siapa yang melihat tiap detail lewat visibility-nya.'
            : 'Kenalan dengan pemilik rumah.'
        }
      />
      <QueryView query={query}>
        {({ profile, details }) => (
          <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_24rem]">
            <ProfileSection profile={profile} editable={isOwner} />
            <DetailsSection details={details} editable={isOwner} />
          </div>
        )}
      </QueryView>
    </>
  )
}

function ProfileSection({ profile, editable }: { profile: Profile; editable: boolean }) {
  const [editing, setEditing] = useState(false)
  if (editing) return <ProfileForm profile={profile} onDone={() => setEditing(false)} />

  return (
    <Card>
      <div className="flex flex-wrap items-center gap-5">
        <Avatar name={profile.full_name} src={profile.photo_url} size="lg" />
        <div className="min-w-0 flex-1">
          <h2 className="font-display text-3xl">{profile.full_name}</h2>
          {profile.headline && <p className="mt-1 text-muted">{profile.headline}</p>}
        </div>
        {editable && (
          <Button variant="secondary" size="sm" onClick={() => setEditing(true)}>
            <Pencil className="size-4" aria-hidden /> Edit profil
          </Button>
        )}
      </div>
      {profile.bio && <p className="mt-6 leading-relaxed whitespace-pre-line">{profile.bio}</p>}
      {profile.skills.length > 0 && (
        <div className="mt-6">
          <h3 className="text-sm font-semibold text-muted">Keahlian</h3>
          <ul className="mt-2 flex flex-wrap gap-2">
            {profile.skills.map((skill, i) => (
              <li key={`${i}-${skill}`} className="rounded-full bg-accent-soft px-3 py-1 text-sm font-medium text-accent">
                {skill}
              </li>
            ))}
          </ul>
        </div>
      )}
    </Card>
  )
}

function ProfileForm({ profile, onDone }: { profile: Profile; onDone: () => void }) {
  const queryClient = useQueryClient()
  const [form, setForm] = useState({
    full_name: profile.full_name,
    headline: profile.headline,
    bio: profile.bio,
    photo_url: profile.photo_url,
    skills: profile.skills.join(', '),
  })
  const mutation = useMutation({
    mutationFn: () =>
      api('/profile', 'PUT', {
        ...form,
        photo_url: form.photo_url.trim(),
        skills: form.skills.split(',').map((s) => s.trim()).filter(Boolean),
      }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: profileKey })
      onDone()
    },
  })
  const bind = (key: keyof typeof form) => ({
    value: form[key],
    onChange: (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setForm((f) => ({ ...f, [key]: e.target.value })),
  })

  return (
    <Card>
      <form onSubmit={handleSubmit(mutation.mutate)} className="space-y-4">
        <h2 className="font-semibold">Edit profil</h2>
        <Field label="Nama lengkap">
          <input required maxLength={100} className={inputClass} {...bind('full_name')} />
        </Field>
        <Field label="Headline" hint="Satu kalimat singkat, mis. Backend developer yang sedang belajar AI.">
          <input maxLength={160} className={inputClass} {...bind('headline')} />
        </Field>
        <Field label="Bio">
          <textarea rows={6} maxLength={4000} className={inputClass} {...bind('bio')} />
        </Field>
        <Field label="URL foto" hint="Tautan gambar (https://...).">
          <input type="url" className={inputClass} {...bind('photo_url')} />
        </Field>
        <Field label="Keahlian" hint="Pisahkan dengan koma, mis. Go, React, PostgreSQL.">
          <input className={inputClass} {...bind('skills')} />
        </Field>
        {mutation.isError && <ErrorNote error={mutation.error} />}
        <div className="flex gap-2">
          <Button type="submit" busy={mutation.isPending}>
            Simpan
          </Button>
          <Button variant="ghost" onClick={onDone}>
            Batal
          </Button>
        </div>
      </form>
    </Card>
  )
}

function DetailsSection({ details, editable }: { details: ProfileDetail[]; editable: boolean }) {
  const [adding, setAdding] = useState(false)
  return (
    <Card>
      <h2 className="font-semibold">Detail & kontak</h2>
      {details.length === 0 ? (
        <p className="mt-2 text-sm text-muted">
          {editable ? 'Tambahkan kontak, sosial media, atau info lain.' : 'Belum ada detail yang bisa kamu lihat.'}
        </p>
      ) : (
        <dl className="mt-3 divide-y divide-line">
          {details.map((detail) => (
            <DetailRow key={detail.id} detail={detail} editable={editable} />
          ))}
        </dl>
      )}
      {editable &&
        (adding ? (
          <div className="mt-4 border-t border-line pt-4">
            <DetailForm onDone={() => setAdding(false)} />
          </div>
        ) : (
          <Button variant="secondary" size="sm" className="mt-4" onClick={() => setAdding(true)}>
            <Plus className="size-4" aria-hidden /> Tambah detail
          </Button>
        ))}
    </Card>
  )
}

function DetailRow({ detail, editable }: { detail: ProfileDetail; editable: boolean }) {
  const queryClient = useQueryClient()
  const [editing, setEditing] = useState(false)
  const remove = useMutation({
    mutationFn: () => api(`/profile/details/${detail.id}`, 'DELETE'),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: profileKey }),
  })

  if (editing) {
    return (
      <div className="py-3">
        <DetailForm detail={detail} onDone={() => setEditing(false)} />
      </div>
    )
  }
  const href = linkFor(detail.value)
  return (
    <div className="flex items-start gap-3 py-3">
      <div className="min-w-0 flex-1">
        <dt className="text-xs font-semibold tracking-wide text-muted uppercase">{detail.label}</dt>
        <dd className="mt-0.5 break-words">
          {href ? (
            <a href={href} target="_blank" rel="noreferrer" className="text-accent hover:underline">
              {detail.value}
            </a>
          ) : (
            detail.value
          )}
        </dd>
      </div>
      {editable && (
        <div className="flex shrink-0 items-center gap-1">
          <VisibilityBadge value={detail.visibility} />
          <Button variant="ghost" size="sm" aria-label={`Edit ${detail.label}`} onClick={() => setEditing(true)}>
            <Pencil className="size-4" aria-hidden />
          </Button>
          <Button
            variant="danger"
            size="sm"
            aria-label={`Hapus ${detail.label}`}
            busy={remove.isPending}
            onClick={() => confirm(`Hapus "${detail.label}"?`) && remove.mutate()}
          >
            {!remove.isPending && <Trash2 className="size-4" aria-hidden />}
          </Button>
        </div>
      )}
    </div>
  )
}

function DetailForm({ detail, onDone }: { detail?: ProfileDetail; onDone: () => void }) {
  const queryClient = useQueryClient()
  const [label, setLabel] = useState(detail?.label ?? '')
  const [value, setValue] = useState(detail?.value ?? '')
  const [visibility, setVisibility] = useState<Visibility>(detail?.visibility ?? 'shared')
  const mutation = useMutation({
    mutationFn: () =>
      detail
        ? api(`/profile/details/${detail.id}`, 'PUT', { label, value, visibility })
        : api('/profile/details', 'POST', { label, value, visibility }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: profileKey })
      onDone()
    },
  })

  return (
    <form onSubmit={handleSubmit(mutation.mutate)} className="space-y-3">
      <Field label="Label">
        <input required maxLength={60} placeholder="mis. WhatsApp" value={label} onChange={(e) => setLabel(e.target.value)} className={inputClass} />
      </Field>
      <Field label="Isi">
        <input required maxLength={500} placeholder="mis. 08xx atau https://..." value={value} onChange={(e) => setValue(e.target.value)} className={inputClass} />
      </Field>
      <VisibilityPicker value={visibility} onChange={setVisibility} />
      {mutation.isError && <ErrorNote error={mutation.error} />}
      <div className="flex gap-2">
        <Button type="submit" size="sm" busy={mutation.isPending}>
          {detail ? 'Simpan' : 'Tambah'}
        </Button>
        <Button variant="ghost" size="sm" onClick={onDone}>
          Batal
        </Button>
      </div>
    </form>
  )
}
