import { Injectable, UnauthorizedException } from '@nestjs/common'
import type { VerifiedToken } from '@interacc/shared-types'
import { resolveIdentity } from '@interacc/db'

export interface LocalUser {
  userId: string
  tenantId: string
}

/**
 * Menjembatani identitas Entra dengan user di database kita.
 * Entra tahu `sub`; aplikasi kita bekerja dengan userId dan tenantId sendiri.
 *
 * Lookup ini terjadi SEBELUM tenant context ada, sehingga tidak bisa lewat RLS.
 * Karena itu dipakai fungsi SECURITY DEFINER `resolve_identity` yang cakupannya
 * sengaja dipersempit hanya untuk penerjemahan ini (lihat packages/db/sql/rls.sql).
 *
 * TODO(lead-dev): tenant diambil dari claim `tid` Entra, atau tabel mapping kita?
 * Saat ini memakai `entraTenantId` dari token sebagai slug tenant.
 */
@Injectable()
export class AuthAccessService {
  async resolveLocalUser(token: VerifiedToken): Promise<LocalUser> {
    if (!token.entraTenantId) {
      throw new UnauthorizedException('Token tidak membawa identitas tenant')
    }

    const identity = await resolveIdentity(token.subject, token.entraTenantId)
    if (!identity) {
      // TODO(day-4): provisioning otomatis saat user Entra login pertama kali.
      throw new UnauthorizedException(
        `User "${token.subject}" tidak terdaftar di tenant "${token.entraTenantId}"`,
      )
    }

    return identity
  }
}
