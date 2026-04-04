// src/components/Waitlist.tsx
import { useState } from 'react'
import { motion } from 'framer-motion'
import { useScrollReveal } from '../hooks/useScrollReveal'

type FormState = 'idle' | 'submitting' | 'success' | 'error'

function validateEmail(value: string): string | null {
  if (!value.trim()) return 'Email is required'
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) return 'Enter a valid email address'
  return null
}

function validatePhone(value: string): string | null {
  if (!value.trim()) return 'Phone number is required'
  const stripped = value.replace(/[\s\-+]/g, '')
  const digits = stripped.length === 12 && stripped.startsWith('91')
    ? stripped.slice(2)
    : stripped
  if (!/^\d{10}$/.test(digits)) return 'Enter a valid 10-digit phone number'
  return null
}

export default function Waitlist() {
  const reveal = useScrollReveal()
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [emailError, setEmailError] = useState<string | null>(null)
  const [phoneError, setPhoneError] = useState<string | null>(null)
  const [formState, setFormState] = useState<FormState>('idle')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()

    const eErr = validateEmail(email)
    const pErr = validatePhone(phone)
    setEmailError(eErr)
    setPhoneError(pErr)
    if (eErr || pErr) return

    const url = import.meta.env.VITE_APPS_SCRIPT_URL as string | undefined
    if (!url) {
      if (import.meta.env.DEV) {
        console.warn('[Waitlist] VITE_APPS_SCRIPT_URL is not set in .env')
      }
      setFormState('error')
      return
    }

    setFormState('submitting')
    try {
      // mode: 'no-cors' is required for Google Apps Script — it redirects to
      // script.googleusercontent.com which doesn't return CORS headers.
      // We get an opaque response (can't read body) but the POST goes through.
      await fetch(url, {
        method: 'POST',
        mode: 'no-cors',
        headers: { 'Content-Type': 'text/plain' },
        body: JSON.stringify({ email, phone }),
      })
      setFormState('success')
    } catch {
      setFormState('error')
    }
  }

  return (
    <section id="waitlist" className="mx-auto max-w-5xl px-6 pb-32 pt-20">
      <motion.div {...reveal} className="rounded-2xl bg-black p-8 md:p-14">
        {formState === 'success' ? (
          <div className="text-center">
            <p className="mb-3 text-3xl font-black text-white">You're on the list.</p>
            <p className="text-gray-400">
              We'll send your early access link when ClearPass launches.
            </p>
          </div>
        ) : (
          <>
            <h2 className="mb-3 text-3xl font-black tracking-tight text-white md:text-4xl">
              Be first in line.
            </h2>
            <p className="mb-8 max-w-lg text-sm leading-relaxed text-gray-400">
              ClearPass is launching soon. Join the waitlist and get early access before anyone
              else — plus a free readiness report when we go live.
            </p>
            <form onSubmit={handleSubmit} noValidate>
              <div className="mb-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <input
                    type="email"
                    placeholder="Email address"
                    aria-label="Email address"
                    value={email}
                    onChange={(e) => { setEmail(e.target.value); setEmailError(null) }}
                    className="w-full rounded-lg border border-gray-700 bg-gray-900 px-4 py-3.5 text-sm text-white placeholder-gray-500 outline-none focus:border-gray-500"
                  />
                  {emailError && <p role="alert" className="mt-1 text-xs text-red-400">{emailError}</p>}
                </div>
                <div>
                  <input
                    type="tel"
                    placeholder="Phone number"
                    aria-label="Phone number"
                    value={phone}
                    onChange={(e) => { setPhone(e.target.value); setPhoneError(null) }}
                    className="w-full rounded-lg border border-gray-700 bg-gray-900 px-4 py-3.5 text-sm text-white placeholder-gray-500 outline-none focus:border-gray-500"
                  />
                  {phoneError && <p role="alert" className="mt-1 text-xs text-red-400">{phoneError}</p>}
                </div>
              </div>
              <button
                type="submit"
                disabled={formState === 'submitting'}
                className="w-full rounded-lg bg-white py-3.5 text-sm font-bold text-black transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {formState === 'submitting' ? 'Submitting…' : 'Secure My Spot →'}
              </button>
              {formState === 'error' && (
                <p className="mt-3 text-center text-xs text-red-400">
                  Something went wrong. Please try again.
                </p>
              )}
            </form>
            <p className="mt-4 text-center text-xs text-gray-600">
              No spam. Just your early access link when we launch.
            </p>
          </>
        )}
      </motion.div>
    </section>
  )
}
