'use client'

import { motion } from 'framer-motion'
import { useScrollReveal } from '@/hooks/useScrollReveal'

export default function CTA() {
  const reveal = useScrollReveal()

  return (
    <section className="mx-auto max-w-5xl px-6 pb-32 pt-20">
      <motion.div {...reveal} className="rounded-2xl bg-black p-8 md:p-14">
        <h2 className="mb-3 text-3xl font-black tracking-tight text-white md:text-4xl">
          Ready to find your weak spots?
        </h2>
        <p className="mb-8 max-w-lg text-sm leading-relaxed text-gray-400">
          Your first chapter is completely free — no card needed.
          Take a diagnostic test and get a detailed readiness report in minutes.
        </p>
        <div className="flex flex-wrap gap-3">
          <a
            href="/sign-in"
            className="rounded-lg bg-white px-7 py-3.5 text-sm font-bold text-black transition-opacity hover:opacity-90"
          >
            Get Started Free →
          </a>
          <a
            href="https://t.me/ClearpassCAbot"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 rounded-lg border border-gray-700 px-7 py-3.5 text-sm font-semibold text-white transition-colors hover:border-gray-500"
          >
            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
              <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.479.33-.913.492-1.302.48-.428-.012-1.252-.242-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"/>
            </svg>
            Practice on Telegram
          </a>
        </div>
        <p className="mt-4 text-xs text-gray-600">
          Free chapter included. No spam, no gimmicks.
        </p>
      </motion.div>
    </section>
  )
}
