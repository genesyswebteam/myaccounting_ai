import { createMongoAbility, type ForcedSubject, type MongoAbility, type RawRuleOf } from '@casl/ability'

export type Action = 'manage' | 'create' | 'read' | 'update' | 'delete' | 'approve'

interface JournalSubject {
  tenantId: string
  status: 'DRAFT' | 'POSTED' | 'VOID'
  createdBy: string
}

export type Subjects =
  | 'all'
  | 'JournalEntry'
  | 'Account'
  | 'User'
  | (JournalSubject & ForcedSubject<'JournalEntry'>)

export type AppAbility = MongoAbility<[Action, Subjects]>

/**
 * Membangun ability dari rule yang dikirim backend.
 *
 * Inilah alasan CASL dipilih: aturan izin ditulis SEKALI di
 * apps/api/src/modules/rbac/ability.factory.ts, lalu dipakai backend untuk
 * menegakkan dan frontend untuk menyembunyikan tombol. Tidak ada logika izin
 * yang diduplikasi, jadi tidak ada risiko keduanya berbeda.
 *
 * Catatan: penyembunyian tombol di sini murni kosmetik. Penegakan sebenarnya
 * tetap di backend — frontend tidak pernah dipercaya.
 */
export function buildAbility(rules: RawRuleOf<AppAbility>[]): AppAbility {
  return createMongoAbility<AppAbility>(rules)
}
