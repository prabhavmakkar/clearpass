interface Props { weaknessAnalysis: string }

export function WeaknessAnalysis({ weaknessAnalysis }: Props) {
  if (!weaknessAnalysis) return null
  const paragraphs = weaknessAnalysis.split('\n').filter(Boolean)
  return (
    <div
      className="mb-6 rounded-2xl p-6 md:p-8 text-white relative overflow-hidden"
      style={{ background: 'var(--color-ink)' }}
    >
      <div
        className="absolute -top-20 -right-20 h-60 w-60 rounded-full"
        style={{ background: 'radial-gradient(circle, rgba(217,80,30,0.18), transparent 65%)' }}
      />
      <div className="relative">
        <p
          className="text-[11px] uppercase tracking-[0.18em] font-semibold mb-3"
          style={{ color: 'var(--color-accent)' }}
        >
          Weakness analysis
        </p>
        <h2 className="font-display text-2xl md:text-3xl mb-5 leading-tight">
          What to fix first.
        </h2>
        <div className="space-y-3 text-[15px] leading-[1.7] text-white/85 max-w-2xl">
          {paragraphs.map((p, i) => (
            <p key={i}>{p}</p>
          ))}
        </div>
      </div>
    </div>
  )
}
