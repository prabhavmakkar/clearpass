// Run lib/schema.sql against Neon. Loads .env.local manually (Node doesn't).
import { readFileSync } from 'node:fs'
import { neon } from '@neondatabase/serverless'

// Minimal dotenv loader
const envText = readFileSync(new URL('../.env.local', import.meta.url), 'utf8')
for (const line of envText.split('\n')) {
  const m = line.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/)
  if (m) process.env[m[1]] ??= m[2]
}

if (!process.env.DATABASE_URL) {
  console.error('DATABASE_URL not found in .env.local')
  process.exit(1)
}

const sql = neon(process.env.DATABASE_URL)
const schema = readFileSync(new URL('../lib/schema.sql', import.meta.url), 'utf8')

// Strip SQL line comments, then split on semicolons
const cleaned = schema
  .split('\n')
  .filter(line => !line.trim().startsWith('--'))
  .join('\n')

const statements = cleaned
  .split(';')
  .map(s => s.trim())
  .filter(s => s.length > 0)

console.log(`Running ${statements.length} statements against Neon...`)
for (const stmt of statements) {
  const preview = stmt.split('\n').find(l => l.trim())?.slice(0, 80) ?? ''
  console.log(`  → ${preview}`)
  await sql.query(stmt)
}
console.log('✓ Schema applied successfully')
