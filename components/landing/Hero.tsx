'use client'

import { useEffect, useRef } from 'react'

export default function Hero() {
  const collageRef = useRef<HTMLDivElement | null>(null)
  const ringTextRef = useRef<SVGTextElement | null>(null)

  // Mouse parallax across the floating cards
  useEffect(() => {
    const collage = collageRef.current
    if (!collage) return
    const floaters = collage.querySelectorAll<HTMLElement>('.hero-floater')
    let targetX = 0, targetY = 0, curX = 0, curY = 0, raf = 0

    const onMove = (e: MouseEvent) => {
      const r = collage.getBoundingClientRect()
      targetX = ((e.clientX - r.left) / r.width - 0.5) * 2
      targetY = ((e.clientY - r.top) / r.height - 0.5) * 2
    }
    const onLeave = () => { targetX = 0; targetY = 0 }
    function tick() {
      curX += (targetX - curX) * 0.08
      curY += (targetY - curY) * 0.08
      floaters.forEach(f => {
        const d = parseFloat(f.dataset.depth ?? '10')
        f.style.setProperty('--mx', (curX * d).toFixed(2) + 'px')
        f.style.setProperty('--my', (curY * d).toFixed(2) + 'px')
      })
      raf = requestAnimationFrame(tick)
    }
    collage.addEventListener('mousemove', onMove)
    collage.addEventListener('mouseleave', onLeave)
    tick()
    return () => {
      cancelAnimationFrame(raf)
      collage.removeEventListener('mousemove', onMove)
      collage.removeEventListener('mouseleave', onLeave)
    }
  }, [])

  // Count-up on the hero score ring (timed to the ring fill animation)
  useEffect(() => {
    const initial = ringTextRef.current
    if (!initial) return
    initial.textContent = '0%'
    const TARGET = 78
    const DURATION = 1700
    const START_DELAY = 950
    const timer = setTimeout(() => {
      const el = ringTextRef.current
      if (!el) return
      const start = performance.now()
      function step(now: number) {
        const node = ringTextRef.current
        if (!node) return
        const t = Math.min(1, (now - start) / DURATION)
        const eased = 1 - Math.pow(1 - t, 3)
        const v = Math.round(eased * TARGET)
        node.textContent = v + '%'
        node.setAttribute('fill', v >= 70 ? '#0E5A3D' : v >= 40 ? '#7A5A0F' : '#7A1F1F')
        if (t < 1) requestAnimationFrame(step)
        else node.setAttribute('fill', '#0A0A0A')
      }
      requestAnimationFrame(step)
    }, START_DELAY)
    return () => clearTimeout(timer)
  }, [])

  return (
    <section className="mx-auto max-w-6xl px-6 pt-10 pb-20 lg:pb-28">
      <div className="grid lg:grid-cols-[1.15fr_1fr] gap-12 items-center">
        {/* Left: copy */}
        <div className="hero-stagger">
          <div className="inline-flex items-center gap-2 mb-7 px-3 py-1 rounded-full border border-[var(--color-line)] bg-paper text-xs">
            <span className="h-1.5 w-1.5 rounded-full bg-[var(--color-success)] animate-pulse" />
            <span className="text-[var(--color-muted)]">Live</span>
            <span className="mx-1 text-[var(--color-line)]">·</span>
            <span>CA Finals · Nov 2026 attempt</span>
          </div>
          <h1 className="font-display text-5xl sm:text-6xl md:text-7xl lg:text-[5.5rem] leading-[0.95] sm:leading-[0.92] tracking-tight">
            CA prep,<br />
            finally{' '}
            <em className="not-italic relative inline-block">
              done&nbsp;right
              <span
                className="underline-draw absolute left-0 right-0 -bottom-1.5 h-2 -z-0"
                style={{ background: 'var(--color-accent)', opacity: 0.85 }}
              />
            </em>
            .
          </h1>
          <p className="mt-7 text-lg md:text-xl text-[var(--color-ink-soft)] max-w-xl leading-relaxed">
            The CA journey is brutal — but failing because you didn&apos;t know{' '}
            <em className="not-italic font-display">where</em> you were weak?{' '}
            <span className="text-[var(--color-ink)] font-medium">That&apos;s a problem we can fix.</span>
          </p>
          <div className="mt-9 flex flex-wrap items-center gap-3">
            <a
              href="/sign-in"
              className="px-7 py-3.5 rounded-xl text-white font-semibold text-sm flex items-center gap-2 hover:opacity-90 transition-opacity"
              style={{ background: 'var(--color-ink)' }}
            >
              Take your first test — free
              <span style={{ color: 'var(--color-accent)' }}>→</span>
            </a>
            <a
              href="https://t.me/ClearpassCAbot"
              target="_blank"
              rel="noopener noreferrer"
              className="px-6 py-3.5 rounded-xl border border-[var(--color-line)] bg-paper font-semibold text-sm flex items-center gap-2 hover:border-[#C7C0AF] transition-colors"
            >
              <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
                <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.479.33-.913.492-1.302.48-.428-.012-1.252-.242-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z" />
              </svg>
              Practice on Telegram
            </a>
          </div>

          {/* Stats */}
          <div className="mt-14 grid grid-cols-3 gap-6 border-t border-[var(--color-line)] pt-7">
            <div>
              <div className="font-display text-4xl md:text-5xl">
                ~5<span style={{ color: 'var(--color-accent)' }}>%</span>
              </div>
              <div className="text-[11px] text-[var(--color-muted)] mt-1.5 leading-tight">
                CA Finals<br />pass rate
              </div>
            </div>
            <div>
              <div className="font-display text-4xl md:text-5xl">
                6<span style={{ color: 'var(--color-accent)' }}>+</span>
              </div>
              <div className="text-[11px] text-[var(--color-muted)] mt-1.5 leading-tight">
                Avg. attempts<br />across levels
              </div>
            </div>
            <div>
              <div className="font-display text-4xl md:text-5xl">0</div>
              <div className="text-[11px] text-[var(--color-muted)] mt-1.5 leading-tight">
                Tools that tell<br />you why you failed
              </div>
            </div>
          </div>
        </div>

        {/* Right: floating product collage */}
        <div ref={collageRef} className="hero-collage relative h-[360px] sm:h-[460px] lg:h-[520px] mt-4 lg:mt-0">
          {/* Card A: main report */}
          <div
            className="hero-floater"
            data-depth="14"
            style={{ top: '1.5rem', left: '50%', marginLeft: '-150px', width: 300, ['--enter-delay' as never]: '.55s' } as React.CSSProperties}
          >
            <div className="hero-bobber" style={{ ['--rest' as never]: '-3deg', ['--bob-offset' as never]: '0s' } as React.CSSProperties}>
              <div className="card p-5" style={{ boxShadow: '0 24px 48px -16px rgba(10,10,10,0.18)' }}>
                <div className="text-[10px] uppercase tracking-[0.18em] text-[var(--color-muted)] mb-1">
                  Readiness · CA Final · AFM
                </div>
                <div className="flex items-center gap-3">
                  <svg width="78" height="78" viewBox="0 0 100 100">
                    <circle cx="50" cy="50" r="42" fill="none" stroke="#ECE6D7" strokeWidth="6" />
                    <circle
                      className="hero-ring-anim"
                      cx="50" cy="50" r="42" fill="none"
                      stroke="#16855B" strokeWidth="6" strokeLinecap="round"
                      transform="rotate(-90 50 50)"
                    />
                    <text
                      ref={ringTextRef}
                      x="50" y="56" textAnchor="middle"
                      className="font-mono" fontSize="22" fontWeight="700" fill="#0A0A0A"
                    >
                      0%
                    </text>
                  </svg>
                  <div>
                    <div className="font-display text-2xl leading-tight">On track</div>
                    <div className="text-[11px] font-semibold" style={{ color: 'var(--color-success)' }}>↑ 12% from last</div>
                  </div>
                </div>
                <div className="mt-4 space-y-2">
                  {[
                    { name: 'Derivatives', pct: 84, color: 'var(--color-success)' },
                    { name: 'Forex', pct: 71, color: 'var(--color-warning)' },
                    { name: 'Interest Rate Risk', pct: 51, color: 'var(--color-error)' },
                  ].map(b => (
                    <div key={b.name}>
                      <div className="flex justify-between text-[10px] mb-0.5">
                        <span>{b.name}</span>
                        <span className="font-mono" style={{ color: b.color }}>{b.pct}%</span>
                      </div>
                      <div className="h-1 rounded-full bg-[var(--color-line-soft)]">
                        <div className="h-full rounded-full" style={{ width: `${b.pct}%`, background: b.color }} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Card B: streak — hidden on tiny screens to avoid overlap with Card A */}
          <div
            className="hero-floater hidden sm:block"
            data-depth="22"
            style={{ bottom: '1.5rem', left: 0, width: 200, ['--enter-delay' as never]: '.7s' } as React.CSSProperties}
          >
            <div className="hero-bobber" style={{ ['--rest' as never]: '-7deg', ['--bob-offset' as never]: '-2.2s' } as React.CSSProperties}>
              <div className="card p-4" style={{ boxShadow: '0 24px 48px -16px rgba(10,10,10,0.18)' }}>
                <div className="text-[10px] uppercase tracking-[0.18em] text-[var(--color-muted)]">Daily streak</div>
                <div className="font-display text-4xl flex items-end gap-1.5">
                  12<span className="fire text-2xl">🔥</span>
                </div>
                <p className="text-[11px] text-[var(--color-muted)] mt-1">Longest: 23 days</p>
                <div className="mt-3 grid grid-cols-7 gap-0.5">
                  {[3,2,4,3,1,4,3].map((n,i) => (
                    <div key={i} className={`h-2 rounded-sm heat-${n}`} />
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Card C: weak-spot callout — hidden on tiny screens to reduce overlap */}
          <div
            className="hero-floater hidden sm:block"
            data-depth="18"
            style={{ top: '0.5rem', right: 0, width: 230, ['--enter-delay' as never]: '.85s' } as React.CSSProperties}
          >
            <div className="hero-bobber" style={{ ['--rest' as never]: '5deg', ['--bob-offset' as never]: '-3.6s' } as React.CSSProperties}>
              <div
                className="card p-4"
                style={{ boxShadow: '0 24px 48px -16px rgba(10,10,10,0.22)', background: 'var(--color-navy)', color: 'white' }}
              >
                <div className="text-[10px] uppercase tracking-[0.18em] opacity-60 mb-1">Weak spot found</div>
                <div className="font-display text-xl leading-tight">
                  &ldquo;Interest rate risk hedging — review SA 580 first.&rdquo;
                </div>
                <div className="mt-3 flex items-center gap-2 text-[11px] opacity-80">
                  <span className="h-1.5 w-1.5 rounded-full" style={{ background: 'var(--color-accent)' }} />
                  AI mentor · 47s ago
                </div>
              </div>
            </div>
          </div>

          {/* Card D: question peek — hidden on tiny screens to reduce overlap */}
          <div
            className="hero-floater hidden sm:block"
            data-depth="26"
            style={{ bottom: 0, right: '1.5rem', width: 220, ['--enter-delay' as never]: '1.0s' } as React.CSSProperties}
          >
            <div className="hero-bobber" style={{ ['--rest' as never]: '3deg', ['--bob-offset' as never]: '-5s' } as React.CSSProperties}>
              <div className="card p-4" style={{ boxShadow: '0 24px 48px -16px rgba(10,10,10,0.18)' }}>
                <div className="text-[10px] uppercase tracking-[0.18em] text-[var(--color-muted)] mb-1">🔥 Hard · 28s</div>
                <div className="text-xs font-medium leading-snug">
                  Under interest rate parity, with i_d = 7% and i_f = 3%, the forward premium is approximately…
                </div>
                <div className="mt-3 grid grid-cols-2 gap-1.5">
                  <div className="text-[10px] rounded border border-[var(--color-line)] py-1 px-1.5">A · −4%</div>
                  <div
                    className="text-[10px] rounded py-1 px-1.5"
                    style={{
                      borderWidth: '1.5px', borderStyle: 'solid',
                      borderColor: 'var(--color-success)',
                      background: 'var(--color-success-soft)',
                      color: '#0E5A3D',
                    }}
                  >
                    B · +4%
                  </div>
                  <div className="text-[10px] rounded border border-[var(--color-line)] py-1 px-1.5">C · Zero</div>
                  <div className="text-[10px] rounded border border-[var(--color-line)] py-1 px-1.5">D · +10%</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
