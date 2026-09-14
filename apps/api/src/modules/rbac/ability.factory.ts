import { Injectable } from '@nestjs/common'
import {
  AbilityBuilder,
  createMongoAbility,
  type ForcedSubject,
  type MongoAbility,
} from '@casl/ability'
import type { RequestContext } from '@interacc/shared-types'

export type Action = 'manage' | 'create' | 'read' | 'update' | 'delete' | 'approve'

/**
 * Sengaja hanya memuat field yang benar-benar dirujuk aturan izin — bukan
 * seluruh bentuk entitas. Dengan begitu RBAC tidak terikat pada bentuk baris
 * database maupun bentuk respons API, yang memang berbeda (mis. createdAt
 * berupa Date di DB tapi string di JSON).
 */
export interface JournalSubject {
  tenantId: string
  status: 'DRAFT' | 'POSTED' | 'VOID'
  createdBy: string
}

interface AccountSubject {
  tenantId: string
}
interface UserSubject {
  tenantId: string
  id: string
}

/**
 * Tiap subject muncul dua kali: sebagai nama (untuk pengecekan kasar, mis.
 * menyembunyikan menu) dan sebagai tipe entitas (supaya conditions berbasis
 * field seperti `status` dan `createdBy` ikut ter-type-check).
 */
export type Subjects =
  | 'all'
  | 'JournalEntry'
  | 'Account'
  | 'User'
  | (JournalSubject & ForcedSubject<'JournalEntry'>)
  | (AccountSubject & ForcedSubject<'Account'>)
  | (UserSubject & ForcedSubject<'User'>)

export type AppAbility = MongoAbility<[Action, Subjects]>

/**
 * Satu-satunya tempat aturan izin didefinisikan.
 *
 * Entra hanya menyerahkan label role ("Accountant"). Semua keputusan
 * boleh/tidak dibuat di sini, karena Entra tidak mengenal jurnal, tenant,
 * maupun status dokumen.
 *
 * TODO(day-4): sebagian aturan akan dibaca dari tabel permission agar tiap
 * tenant bisa punya role custom (lihat "Customer Custom Modules" di diagram).
 */
@Injectable()
export class AbilityFactory {
  createForContext(ctx: RequestContext): AppAbility {
    const { can, cannot, build } = new AbilityBuilder<AppAbility>(createMongoAbility)

    // Tanpa identitas tenant yang jelas, tidak ada satu pun izin yang diberikan.
    const { tenantId, userId } = ctx
    if (!tenantId || !userId) return build()

    // Setiap rule dikunci ke tenantId. Ini lapisan izin, BUKAN pengganti RLS.
    // Admin di sini adalah admin TENANT, bukan superadmin lintas tenant.
    // Sengaja di-grant per-subject, bukan can('manage', 'all'), supaya
    // batas tenantnya ter-type-check dan tidak bisa bocor tanpa sengaja.
    if (ctx.roles.includes('Admin')) {
      can('manage', 'JournalEntry', { tenantId })
      can('manage', 'Account', { tenantId })
      can('manage', 'User', { tenantId })
    }

    if (ctx.roles.includes('Accountant')) {
      can('read', 'JournalEntry', { tenantId })
      can('create', 'JournalEntry', { tenantId })
      can('update', 'JournalEntry', { tenantId, status: 'DRAFT' })
    }

    if (ctx.roles.includes('Finance')) {
      can('read', 'JournalEntry', { tenantId })
      can('approve', 'JournalEntry', { tenantId, status: 'DRAFT' })
    }

    if (ctx.roles.includes('User') || ctx.roles.includes('External')) {
      can('read', 'JournalEntry', { tenantId })
    }

    // --- Aturan yang tidak bisa ditawar, berlaku untuk semua role ---

    // Segregation of duties: prinsip akuntansi, bukan sekadar aturan aplikasi.
    cannot('approve', 'JournalEntry', { createdBy: userId }).because(
      'Tidak boleh approve jurnal buatan sendiri',
    )

    cannot('delete', 'JournalEntry', { status: 'POSTED' }).because(
      'Jurnal yang sudah di-posting tidak boleh dihapus',
    )

    return build()
  }
}
