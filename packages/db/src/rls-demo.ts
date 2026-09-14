/**
 * Bukti bahwa isolasi tenant ditegakkan Postgres, bukan oleh kode aplikasi.
 *
 * Jalankan:  pnpm db:demo-rls
 *
 * Semua query di bawah ini SENGAJA tidak punya `WHERE tenant_id`.
 * Yang membedakan hasilnya hanya tenant context di dalam transaksi.
 */
import { sql } from 'drizzle-orm'
import { db, withTenant, client } from './client'
import { journalEntries, auditLog } from './schema'

const line = (s = '') => console.log(s)
const ok = (s: string) => console.log(`  \x1b[32m✓\x1b[0m ${s}`)
const bad = (s: string) => console.log(`  \x1b[31m✗\x1b[0m ${s}`)

async function main(): Promise<void> {
  const tenants = await db.execute<{ id: string; slug: string }>(
    sql`SELECT id, slug FROM resolve_tenants_for_demo()`,
  )
  const a = tenants.find((t) => t.slug === 'tenant-a')!
  const b = tenants.find((t) => t.slug === 'tenant-b')!

  line('\n\x1b[1m1. Developer LUPA menyetel tenant context\x1b[0m')
  line('   SELECT * FROM journal_entries   (tanpa withTenant)')
  const leaked = await db.select().from(journalEntries)
  leaked.length === 0
    ? ok(`${leaked.length} baris — RLS gagal secara tertutup, tidak ada yang bocor`)
    : bad(`${leaked.length} baris BOCOR — RLS tidak aktif!`)

  line('\n\x1b[1m2. Query yang SAMA PERSIS, context tenant-a\x1b[0m')
  const rowsA = await withTenant(a.id, (tx) => tx.select().from(journalEntries))
  ok(`${rowsA.length} baris: ${rowsA.map((r) => r.reference).join(', ')}`)

  line('\n\x1b[1m3. Query yang SAMA PERSIS, context tenant-b\x1b[0m')
  const rowsB = await withTenant(b.id, (tx) => tx.select().from(journalEntries))
  ok(`${rowsB.length} baris: ${rowsB.map((r) => r.reference).join(', ')}`)

  line('\n\x1b[1m4. Context tenant-a, INSERT ber-tenant_id tenant-b\x1b[0m')
  try {
    await withTenant(a.id, (tx) =>
      tx.insert(journalEntries).values({
        tenantId: b.id,
        reference: 'HACK/001',
        description: 'nyusup ke tenant lain',
        amount: '1.0000',
        createdBy: rowsA[0]!.createdBy,
      }),
    )
    bad('INSERT lolos — WITH CHECK tidak bekerja!')
  } catch (err) {
    ok(`Ditolak: ${(err as Error).message.split('\n')[0]}`)
  }

  line('\n\x1b[1m5. audit_log harus append-only — coba UPDATE\x1b[0m')
  try {
    await withTenant(a.id, (tx) => tx.update(auditLog).set({ action: 'diubah' }))
    bad('UPDATE lolos — audit trail bisa dipalsukan!')
  } catch (err) {
    ok(`Ditolak: ${(err as Error).message.split('\n')[0]}`)
  }

  line()
  await client.end()
}

main().catch(async (err) => {
  console.error('\n❌ Demo gagal:', err)
  await client.end()
  process.exit(1)
})
