export default function ProgressBar({ value, label }: { value: number; label: string }) {
  return (
    <div
      role="progressbar"
      aria-label={label}
      aria-valuenow={Math.round(value)}
      aria-valuemin={0}
      aria-valuemax={100}
      className="h-2 w-full overflow-hidden rounded-full bg-sunken"
    >
      <div className="h-full rounded-full bg-accent transition-[width]" style={{ width: `${value}%` }} />
    </div>
  )
}
