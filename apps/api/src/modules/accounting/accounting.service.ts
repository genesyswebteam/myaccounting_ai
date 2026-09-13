import { Injectable, NotFoundException } from '@nestjs/common'
import { eq } from 'drizzle-orm'
import { auditLog, journalEntries, withTenant } from '@interacc/db'
import { getRequestContext } from '../../common/context/request-context'

@Injectable()
export class AccountingService {
  /**
   * Perhatikan: query ini SENGAJA tidak punya WHERE tenant_id.
   *
   * Penyaringan tenant dikerjakan Postgres RLS di dalam withTenant().
   * Inilah bedanya dengan menyaring di aplikasi — kalau suatu hari ada
   * developer lupa menambahkan filter, database yang menolak, bukan berharap
   * pada ketelitian kode.
   */
  async findAllForTenant(tenantId: string) {
    return withTenant(tenantId, async (tx) => tx.select().from(journalEntries))
  }

  async findOneForTenant(id: string, tenantId: string) {
    const journal = await withTenant(tenantId, async (tx) => {
      const rows = await tx.select().from(journalEntries).where(eq(journalEntries.id, id))
      return rows[0]
    })
    if (!journal) throw new NotFoundException(`Jurnal ${id} tidak ditemukan`)
    return journal
  }

  /**
   * Approve dan audit trail-nya ditulis dalam SATU transaksi.
   * Kalau audit gagal, approve ikut dibatalkan — jejak audit tidak boleh
   * bolong terhadap perubahan yang benar-benar terjadi.
   */
  async approve(id: string, tenantId: string, actorId: string) {
    return withTenant(tenantId, async (tx) => {
      const before = (await tx.select().from(journalEntries).where(eq(journalEntries.id, id)))[0]
      if (!before) throw new NotFoundException(`Jurnal ${id} tidak ditemukan`)

      const after = (
        await tx
          .update(journalEntries)
          .set({ status: 'POSTED', approvedBy: actorId })
          .where(eq(journalEntries.id, id))
          .returning()
      )[0]

      await tx.insert(auditLog).values({
        tenantId,
        actorId,
        action: 'APPROVE',
        entityType: 'JournalEntry',
        entityId: id,
        before,
        after,
        requestId: getRequestContext()?.requestId,
      })

      return after
    })
  }
}
