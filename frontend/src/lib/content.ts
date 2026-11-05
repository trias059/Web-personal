import type { Comment, RoomId } from './types'

/** Vlog dan Kenangan berbentuk sama, jadi satu halaman dipakai dengan konfigurasi berbeda. */
export interface ContentConfig {
  room: Extract<RoomId, 'vlog' | 'kenangan'>
  apiPath: '/vlogs' | '/memories'
  targetType: Comment['target_type']
  layout: 'feed' | 'gallery'
  copy: {
    description: string
    create: string
    empty: string
    titlePlaceholder: string
    bodyLabel: string
    dateLabel: string
    mediaHint: string
  }
}

export const VLOG: ContentConfig = {
  room: 'vlog',
  apiPath: '/vlogs',
  targetType: 'vlog',
  layout: 'feed',
  copy: {
    description: 'Cerita harian, foto, dan video. Setiap tulisan punya visibility sendiri.',
    create: 'Tulis vlog',
    empty: 'Belum ada vlog yang bisa kamu lihat.',
    titlePlaceholder: 'mis. Hari pertama belajar Go',
    bodyLabel: 'Cerita',
    dateLabel: 'Tanggal',
    mediaHint: 'Opsional: tautan foto, video .mp4, atau YouTube.',
  },
}

export const KENANGAN: ContentConfig = {
  room: 'kenangan',
  apiPath: '/memories',
  targetType: 'memory',
  layout: 'gallery',
  copy: {
    description: 'Foto dan catatan momen yang ingin diingat.',
    create: 'Simpan kenangan',
    empty: 'Belum ada kenangan yang bisa kamu lihat.',
    titlePlaceholder: 'mis. Lebaran di rumah nenek',
    bodyLabel: 'Catatan',
    dateLabel: 'Tanggal kenangan',
    mediaHint: 'Tautan foto (https://...), video, atau YouTube.',
  },
}
