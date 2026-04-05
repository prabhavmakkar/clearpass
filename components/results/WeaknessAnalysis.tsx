interface Props { weaknessAnalysis: string }

export function WeaknessAnalysis({ weaknessAnalysis }: Props) {
  if (!weaknessAnalysis) return null
  const paragraphs = weaknessAnalysis.split('\n').filter(Boolean)
  return (
    <div className="mb-8 rounded-2xl bg-black p-6 md:p-8">
      <h2 className="mb-4 text-lg font-black text-white">Weakness Analysis</h2>
      <div className="space-y-3">
        {paragraphs.map((p, i) => (
          <p key={i} className="text-sm leading-relaxed text-gray-300">{p}</p>
        ))}
      </div>
    </div>
  )
}
