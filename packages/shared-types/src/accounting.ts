export type JournalStatus = 'DRAFT' | 'POSTED' | 'VOID'

/**
 * Catatan penting soal `amount`: bertipe string, bukan number.
 * Postgres numeric dikembalikan Drizzle sebagai string supaya presisi desimalnya
 * tidak rusak oleh floating point. Jangan pernah parseFloat untuk hitungan uang.
 */
export interface JournalEntry {
  id: string
  tenantId: string
  reference: string
  description: string
  amount: string
  status: JournalStatus
  createdBy: string
  createdAt: string
}
