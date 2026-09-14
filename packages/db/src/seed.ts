import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'
import { tenants, users, journalEntries, auditLog } from './schema'

/**
 * Seed dijalankan sebagai admin: superuser menembus RLS, sehingga data untuk
 * beberapa tenant bisa ditulis dalam satu proses. Aplikasi TIDAK PERNAH
 * memakai koneksi ini.
 *
 * Sengaja mengisi DUA tenant supaya isolasi bisa langsung diuji.
 */
const adminUrl = process.env.DATABASE_URL ?? 'postgresql://interacc:interacc@localhost:5432/interacc'

async function main(): Promise<void> {
  const client = postgres(adminUrl, { max: 1 })
  const db = drizzle(client)

  console.log('→ Mengosongkan data lama...')
  await db.delete(auditLog)
  await db.delete(journalEntries)
  await db.delete(users)
  await db.delete(tenants)

  console.log('→ Membuat tenant...')
  const [tenantA, tenantB] = await db
    .insert(tenants)
    .values([
      { slug: 'tenant-a', name: 'PT Maju Bersama', entraTenantId: 'entra-tenant-a' },
      { slug: 'tenant-b', name: 'PT Sinar Abadi', entraTenantId: 'entra-tenant-b' },
    ])
    .returning()

  if (!tenantA || !tenantB) throw new Error('Gagal membuat tenant')

  console.log('→ Membuat user...')
  const [budi, sari, dewi] = await db
    .insert(users)
    .values([
      { tenantId: tenantA.id, entraSubject: 'budi', name: 'Budi', email: 'budi@maju.co.id' },
      { tenantId: tenantA.id, entraSubject: 'sari', name: 'Sari', email: 'sari@maju.co.id' },
      { tenantId: tenantB.id, entraSubject: 'dewi', name: 'Dewi', email: 'dewi@sinar.co.id' },
    ])
    .returning()

  if (!budi || !sari || !dewi) throw new Error('Gagal membuat user')

  console.log('→ Membuat jurnal...')
  await db.insert(journalEntries).values([
    {
      tenantId: tenantA.id,
      reference: 'INV/2026/001',
      description: 'Penjualan jasa konsultasi',
      amount: '15000000.0000',
      status: 'DRAFT',
      createdBy: budi.id,
    },
    {
      tenantId: tenantA.id,
      reference: 'INV/2026/002',
      description: 'Pembelian perangkat kantor',
      amount: '4250000.5000',
      status: 'POSTED',
      createdBy: sari.id,
    },
    {
      tenantId: tenantB.id,
      reference: 'INV/2026/001',
      description: 'Milik tenant lain — tidak boleh terlihat oleh tenant-a',
      amount: '9900000.0000',
      status: 'DRAFT',
      createdBy: dewi.id,
    },
  ])

  console.log('')
  console.log('✅ Seed selesai')
  console.log(`   tenant-a (${tenantA.name})  ${tenantA.id}   user: budi, sari`)
  console.log(`   tenant-b (${tenantB.name})  ${tenantB.id}   user: dewi`)
  console.log('')
  console.log('   Token dev memakai slug, bukan uuid:')
  console.log('     stub:budi:tenant-a:Accountant')
  console.log('     stub:sari:tenant-a:Finance')
  console.log('     stub:dewi:tenant-b:Accountant')

  await client.end()
}

main().catch((err) => {
  console.error('❌ Seed gagal:', err)
  process.exit(1)
})
