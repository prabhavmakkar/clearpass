'use client'
import { useState } from 'react'

export function AdminShell() {
  const [password, setPassword] = useState('')
  const [authed, setAuthed] = useState(false)
  const [status, setStatus] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleUpload(endpoint: string, file: File) {
    setLoading(true)
    setStatus(null)
    const form = new FormData()
    form.append('file', file)
    try {
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'x-admin-password': password },
        body: form,
      })
      const data = await res.json()
      setStatus(res.ok ? `Success: ${JSON.stringify(data)}` : `Error: ${data.error}`)
    } catch {
      setStatus('Network error')
    } finally {
      setLoading(false)
    }
  }

  if (!authed) {
    return (
      <div className="mx-auto max-w-md px-6 py-20">
        <h1 className="mb-6 text-2xl font-black">Admin</h1>
        <input
          type="password"
          placeholder="Admin password"
          value={password}
          onChange={e => setPassword(e.target.value)}
          className="mb-4 w-full rounded-lg border border-gray-200 px-4 py-3 text-sm"
        />
        <button
          onClick={() => { if (password) setAuthed(true) }}
          className="w-full rounded-lg bg-black px-6 py-3 text-sm font-bold text-white"
        >
          Enter
        </button>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-2xl px-6 py-12">
      <h1 className="mb-8 text-2xl font-black">Content Manager</h1>

      <section className="mb-10">
        <h2 className="mb-3 text-lg font-bold">Upload Syllabus (CSV)</h2>
        <p className="mb-3 text-sm text-gray-500">
          Columns: subject_id, subject_name, section_id, section_name, section_weight,
          chapter_id, chapter_name, chapter_weight, sort_order
        </p>
        <input
          type="file"
          accept=".csv"
          onChange={e => {
            const file = e.target.files?.[0]
            if (file) handleUpload('/api/admin/upload-syllabus', file)
          }}
          className="text-sm"
        />
      </section>

      <section className="mb-10">
        <h2 className="mb-3 text-lg font-bold">Upload Questions (CSV)</h2>
        <p className="mb-3 text-sm text-gray-500">
          Columns: chapter_id, difficulty, stem, option_a, option_b, option_c, option_d,
          correct_option, explanation, icai_reference
        </p>
        <input
          type="file"
          accept=".csv"
          onChange={e => {
            const file = e.target.files?.[0]
            if (file) handleUpload('/api/admin/upload-questions', file)
          }}
          className="text-sm"
        />
      </section>

      {loading && <p className="text-sm text-gray-500">Uploading...</p>}
      {status && (
        <div className={`rounded-lg p-4 text-sm ${status.startsWith('Error') ? 'bg-red-50 text-red-700' : 'bg-green-50 text-green-700'}`}>
          {status}
        </div>
      )}
    </div>
  )
}
