import { Injectable, UnauthorizedException } from '@nestjs/common'
import { ROLES, type Role, type VerifiedToken } from '@interacc/shared-types'
import type { TokenVerifier } from './token-verifier'

/**
 * Verifier untuk development, dipakai selama kredensial Azure belum tersedia.
 * Menerima token dengan format: stub:<subject>:<tenantId>:<role,role>
 * Contoh: stub:budi:tenant-a:Accountant
 *
 * Hanya aktif saat AUTH_MODE=stub. Bootstrap menolak jalan kalau mode ini
 * terpakai di NODE_ENV=production.
 */
@Injectable()
export class StubTokenVerifier implements TokenVerifier {
  async verify(rawToken: string): Promise<VerifiedToken> {
    const parts = rawToken.split(':')
    if (parts[0] !== 'stub' || parts.length < 4) {
      throw new UnauthorizedException('Format stub token: stub:<subject>:<tenantId>:<roles>')
    }

    const [, subject, entraTenantId, roleList] = parts
    const roles = (roleList ?? '')
      .split(',')
      .map((r) => r.trim())
      .filter((r): r is Role => (ROLES as readonly string[]).includes(r))

    if (!subject || !entraTenantId || roles.length === 0) {
      throw new UnauthorizedException('Stub token tidak lengkap atau role tidak dikenal')
    }

    return { subject, entraTenantId, roles, name: subject }
  }
}
