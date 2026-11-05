import { useMutation } from '@tanstack/react-query'
import { Bot, Send } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'

import { api } from '../lib/api'
import { handleSubmit } from '../lib/forms'
import { inputClass } from '../lib/styles'
import type { ChatMessage } from '../lib/types'
import RichText from './RichText'
import { Button, ErrorNote } from './ui'

interface Props {
  mode: 'tutor' | 'curhat'
  learningItemId?: number
  greeting: string
  placeholder: string
}

/**
 * Chat dengan LLM lewat /api/ai/chat. Riwayat hanya disimpan di state halaman dan
 * dikirim utuh setiap giliran, jadi percakapan hilang saat halaman ditutup.
 */
export default function ChatPanel({ mode, learningItemId, greeting, placeholder }: Props) {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [draft, setDraft] = useState('')
  const bottomRef = useRef<HTMLDivElement>(null)

  const send = useMutation({
    mutationFn: (history: ChatMessage[]) =>
      api<{ reply: string }>('/ai/chat', 'POST', { mode, learning_item_id: learningItemId, messages: history }),
    onSuccess: ({ reply }, history) => setMessages([...history, { role: 'assistant', content: reply }]),
  })

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
  }, [messages, send.isPending])

  const submit = () => {
    const content = draft.trim()
    if (!content || send.isPending) return
    const history: ChatMessage[] = [...messages, { role: 'user', content }]
    setMessages(history)
    setDraft('')
    send.mutate(history)
  }

  return (
    <div className="flex flex-col">
      <div className="max-h-[28rem] min-h-48 space-y-4 overflow-y-auto pr-1">
        <Bubble role="assistant" content={greeting} />
        {messages.map((message, i) => (
          <Bubble key={i} {...message} />
        ))}
        {send.isPending && <p className="text-sm text-muted">Sedang mengetik…</p>}
        <div ref={bottomRef} />
      </div>
      {send.isError && (
        <div className="mt-3">
          <ErrorNote error={send.error} />
        </div>
      )}
      <form onSubmit={handleSubmit(submit)} className="mt-4 flex items-end gap-2">
        <label className="sr-only" htmlFor={`chat-${mode}`}>
          Pesan
        </label>
        <textarea
          id={`chat-${mode}`}
          rows={2}
          maxLength={8000}
          placeholder={placeholder}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault()
              submit()
            }
          }}
          className={`${inputClass} resize-none`}
        />
        <Button type="submit" aria-label="Kirim" busy={send.isPending} disabled={!draft.trim()}>
          {!send.isPending && <Send className="size-4" aria-hidden />}
        </Button>
      </form>
    </div>
  )
}

function Bubble({ role, content }: ChatMessage) {
  if (role === 'user') {
    return (
      <div className="ml-auto max-w-[85%] rounded-2xl rounded-br-md bg-accent px-4 py-2.5 whitespace-pre-line text-on-accent">
        {content}
      </div>
    )
  }
  return (
    <div className="flex max-w-[92%] gap-2.5">
      <span className="mt-0.5 grid size-8 shrink-0 place-items-center rounded-full bg-accent-soft text-accent">
        <Bot className="size-4" aria-hidden />
      </span>
      <div className="min-w-0 rounded-2xl rounded-tl-md bg-sunken px-4 py-2.5">
        <RichText text={content} />
      </div>
    </div>
  )
}
