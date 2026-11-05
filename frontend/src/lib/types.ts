// Bentuk data dari API backend (lihat backend/internal/store).

export type Role = 'super_admin' | 'keluarga' | 'teman_dekat' | 'teman'
export type RoomId = 'biodata' | 'learning' | 'vlog' | 'curhat' | 'kenangan' | 'data'
export type Visibility = 'private' | 'shared' | 'public'
export type Track = 'bahasa' | 'backend' | 'ai'
export type Grade = 'again' | 'hard' | 'good' | 'easy'
export type MoodLabel = 'positif' | 'netral' | 'negatif'

export interface User {
  id: number
  name: string
  email: string
  role: Role
  created_at: string
}

export interface SessionUser extends User {
  rooms: RoomId[]
  can_comment: boolean
}

export interface Session {
  token: string
  user: SessionUser
}

export interface Profile {
  full_name: string
  headline: string
  bio: string
  photo_url: string
  skills: string[]
  updated_at: string
}

export interface ProfileDetail {
  id: number
  label: string
  value: string
  visibility: Visibility
}

export interface ProfileResponse {
  profile: Profile
  details: ProfileDetail[]
}

export interface Content {
  id: number
  title: string
  body: string
  media_url: string
  visibility: Visibility
  happened_on: string
  comment_count: number
  created_at: string
  updated_at: string
}

export type ContentInput = Pick<Content, 'title' | 'body' | 'media_url' | 'visibility' | 'happened_on'>

export interface Comment {
  id: number
  target_type: 'vlog' | 'memory'
  target_id: number
  user_id: number
  user_name: string
  user_role: Role
  body: string
  created_at: string
}

export interface LearningItem {
  id: number
  track: Track
  title: string
  notes: string
  progress: number
  card_count: number
  due_count: number
  created_at: string
  updated_at: string
}

export interface Flashcard {
  id: number
  learning_item_id: number
  item_title: string
  track: Track
  question: string
  answer: string
  interval_days: number
  repetitions: number
  due_at: string
}

export interface QuizQuestion {
  question: string
  choices: string[]
  answer: number
  explanation: string
}

export interface CurhatEntry {
  id: number
  body: string
  mood_score: number
  mood_label: MoodLabel
  ai_reply: string
  created_at: string
}

export interface Sentiment {
  score: number
  label: MoodLabel
  terms: { word: string; weight: number }[]
}

export interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
}

export interface Stats {
  users_by_role: Partial<Record<Role, number>>
  records: Record<string, number>
  tracks: { track: Track; items: number; avg_progress: number }[]
}
