import { drizzle } from 'drizzle-orm/postgres-js'
import { migrate } from 'drizzle-orm/postgres-js/migrator'
import { sql } from 'drizzle-orm'
import postgres from 'postgres'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

/**
 * Migrasi dijalankan sebagai user admin (`interacc`), bukan `interacc_app`:
 * hanya admin yang boleh membuat tabel, role, dan policy.
 */
const adminUrl = process.env.DATABASE_URL ?? 'postgresql://interacc:interacc@localhost:5432/interacc'

async function main(): Promise<void> {
  const client = postgres(adminUrl, { max: 1 })
  const db = drizzle(client)

  console.log('→ Menjalankan migrasi schema...')
  await migrate(db, { migrationsFolder: join(__dirname, '..', 'drizzle') })

  // RLS diterapkan terpisah dan idempotent, supaya policy selalu selaras
  // dengan tabel terbaru setiap kali migrasi dijalankan.
  console.log('→ Menerapkan RLS policy...')
  const rls = readFileSync(join(__dirname, '..', 'sql', 'rls.sql'), 'utf8')
  await db.execute(sql.raw(rls))

  console.log('✅ Migrasi + RLS selesai')
  await client.end()
}

main().catch((err) => {
  console.error('❌ Migrasi gagal:', err)
  process.exit(1)
})
