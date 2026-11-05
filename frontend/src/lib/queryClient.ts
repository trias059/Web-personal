import { QueryClient } from '@tanstack/react-query'

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: false, refetchOnWindowFocus: false },
  },
})

/** Query key daftar materi; dipakai beberapa halaman Learning Room untuk menyegarkan hitungan kartu. */
export const LEARNING_KEY = ['learning']

export const flashcardsKey = (itemId: number) => ['flashcards', itemId]
