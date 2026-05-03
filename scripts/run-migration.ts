import { neon } from '@neondatabase/serverless'
import { readFileSync } from 'fs'

const sqlPath = process.argv[2]
if (!sqlPath) {
  console.error('Usage: node --env-file=.env.local --import tsx/esm scripts/run-migration.ts <path-to-sql>')
  process.exit(1)
}

const dbUrl = process.env.DATABASE_URL
if (!dbUrl) {
  console.error('DATABASE_URL not set')
  process.exit(1)
}

const sql = neon(dbUrl)
const text = readFileSync(sqlPath, 'utf8')

// Strip block-level comments and split into statements.
// Naive splitter: handles our migration shape (no quoted semicolons, $$ blocks treated as a single statement).
const statements: string[] = []
let buf = ''
let inDollar = false
for (const line of text.split('\n')) {
  const trimmed = line.trim()
  if (trimmed.startsWith('--') && buf.length === 0) continue
  buf += line + '\n'
  if (line.includes('$$')) inDollar = !inDollar
  if (!inDollar && trimmed.endsWith(';')) {
    const stmt = buf.trim()
    if (stmt && !stmt.replace(/--.*$/gm, '').trim().match(/^;*$/)) {
      statements.push(stmt.replace(/;$/, ''))
    }
    buf = ''
  }
}

console.log(`Running ${statements.length} statements from ${sqlPath}\n`)
for (const stmt of statements) {
  const preview = stmt.replace(/\s+/g, ' ').slice(0, 100)
  console.log('---')
  console.log(preview + (stmt.length > 100 ? '...' : ''))
  await sql.query(stmt)
}
console.log('---\nMigration complete.')
