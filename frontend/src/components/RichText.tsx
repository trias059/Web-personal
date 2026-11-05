/**
 * Menampilkan balasan AI: blok kode ```...``` menjadi <pre>, sisanya teks biasa
 * dengan baris baru dipertahankan. Semua isi di-escape oleh React.
 */
export default function RichText({ text }: { text: string }) {
  const parts = text.split(/```[\w-]*\n?/)
  return (
    <div className="space-y-3">
      {parts.map((part, i) =>
        i % 2 === 1 ? (
          <pre key={i} className="overflow-x-auto rounded-xl bg-ink/90 p-3 text-sm text-paper">
            <code>{part.replace(/\n$/, '')}</code>
          </pre>
        ) : (
          part.trim() && (
            <p key={i} className="whitespace-pre-line">
              {part.trim()}
            </p>
          )
        ),
      )}
    </div>
  )
}
