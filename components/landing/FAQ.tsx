'use client'

const FAQS: { q: string; a: string }[] = [
  {
    q: 'Is the diagnostic test really free?',
    a: 'Yes — the first 20-question readiness test runs end-to-end on a free preview chapter in any subject. You see the full report (sections, weak spots, study plan) before paying anything.',
  },
  {
    q: "What's actually in the ₹299 bundle?",
    a: 'Every chapter across AFM, FR, Audit, and IDT — unlimited assessments, adaptive practice, AI-written study plans per attempt, Telegram bot access, mastery tracking, and all future question-bank updates. One payment, no subscription.',
  },
  {
    q: 'How is this different from CA Wallah / Unacademy / 1FinanceMango?',
    a: 'Those are content platforms — videos, notes, mocks. ClearPass is a diagnostic. We tell you which chapter to revisit and why, based on your actual answers. We replace nothing in your prep stack; we sit on top of it.',
  },
  {
    q: 'Are the questions ICAI pattern?',
    a: 'Yes. Each question is tagged by chapter and ICAI mark weightage, and the readiness score is weighted by the official ICAI allocation — so a 70% on a high-weight chapter pulls more than 70% on a low-weight one. A practising CA reviews every Audit question.',
  },
  {
    q: 'What if I want a refund?',
    a: "We don't offer refunds on digital content — but the first diagnostic test is free, so you only pay after you've used the product. If something is broken, email snpventures.com@gmail.com and we'll sort it out personally.",
  },
  {
    q: 'Will my data stay private?',
    a: 'Sign-in is Google OAuth — we never see your password. Your assessment history is stored against your account and is never shared. Email us to delete everything any time.',
  },
]

export default function FAQ() {
  return (
    <section className="mx-auto max-w-6xl px-6 py-20 lg:py-28">
      <div className="grid lg:grid-cols-[1fr_1.5fr] gap-10 lg:gap-16">
        <div>
          <p className="eyebrow mb-3">FAQ</p>
          <h2 className="font-display text-4xl md:text-5xl leading-[1.02]">
            Honest answers to the questions you&apos;d ask anyway.
          </h2>
          <p className="mt-5 text-sm text-[var(--color-muted)]">
            Still unsure?{' '}
            <a
              href="mailto:snpventures.com@gmail.com"
              className="underline underline-offset-2 hover:text-[var(--color-ink)]"
            >
              snpventures.com@gmail.com
            </a>
          </p>
        </div>
        <div className="space-y-2">
          {FAQS.map((f) => (
            <details key={f.q} className="card group cursor-pointer overflow-hidden">
              <summary className="list-none px-5 py-4 flex items-center justify-between gap-4 cursor-pointer">
                <span className="font-medium text-[15px]">{f.q}</span>
                <span className="text-2xl text-[var(--color-muted)] leading-none transition-transform group-open:rotate-45">
                  +
                </span>
              </summary>
              <div className="px-5 pb-5 text-sm text-[var(--color-ink-soft)] leading-relaxed border-t border-[var(--color-line)] pt-4">
                {f.a}
              </div>
            </details>
          ))}
        </div>
      </div>
    </section>
  )
}
