import { drizzle, type PostgresJsDatabase } from 'drizzle-orm/postgres-js'
import { sql } from 'drizzle-orm'
import postgres from 'postgres'
import * as schema from './schema'

export type Database = PostgresJsDatabase<typeof schema>
export type TenantTransaction = Parameters<Parameters<Database['transaction']>[0]>[0]

/**
 * Koneksi RUNTIME memakai `interacc_app` — NOSUPERUSER, tunduk pada RLS.
 * Jangan pernah menunjuk ini ke DATABASE_URL (user `interacc` adalah superuser
 * sekaligus pemilik tabel, sehingga RLS tidak berlaku untuknya).
 */
const connectionString =
  process.env.DATABASE_APP_URL ?? 'postgresql://interacc_app:interacc_app@localhost:5432/interacc'

export const client = postgres(connectionString)
export const db: Database = drizzle(client, { schema })

/**
 * Menjalankan query di dalam transaksi yang tenant context-nya sudah disetel,
 * sehingga RLS menyaring otomatis di level database.
 *
 * Catatan: memakai set_config(..., true) — bukan `SET LOCAL app.tenant_id = '...'`.
 * Perintah SET tidak menerima parameter terikat, jadi nilainya harus
 * disambung sebagai string — dan itu jalur SQL injection. set_config()
 * adalah fungsi biasa, sehingga nilainya bisa dikirim sebagai parameter.
 *
 * Argumen ketiga `true` berarti "local": efeknya berakhir bersama transaksi,
 * jadi tidak bocor ke request lain yang memakai koneksi sama dari pool.
 */
export async function withTenant<T>(
  tenantId: string,
  fn: (tx: TenantTransaction) => Promise<T>,
): Promise<T> {
  return db.transaction(async (tx) => {
    await tx.execute(sql`SELECT set_config('app.tenant_id', ${tenantId}, true)`)
    return fn(tx)
  })
}

/** Menerjemahkan identitas Entra ke user + tenant lokal. Dipakai saat autentikasi. */
export async function resolveIdentity(
  entraSubject: string,
  tenantSlug: string,
): Promise<{ userId: string; tenantId: string } | null> {
  const rows = await db.execute<{ user_id: string; tenant_id: string }>(
    sql`SELECT * FROM resolve_identity(${entraSubject}, ${tenantSlug})`,
  )
  const row = rows[0]
  return row ? { userId: row.user_id, tenantId: row.tenant_id } : null
}
