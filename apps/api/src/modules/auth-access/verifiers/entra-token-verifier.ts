import { Injectable, UnauthorizedException } from '@nestjs/common'
import type { VerifiedToken } from '@interacc/shared-types'
import type { TokenVerifier } from './token-verifier'

/**
 * Verifier produksi: memvalidasi JWT terbitan Microsoft Entra.
 *
 * BELUM DIIMPLEMENTASI — menunggu kredensial tenant Azure dari lead dev.
 * Langkah yang perlu dikerjakan nanti:
 *   1. Ambil JWKS dari  https://login.microsoftonline.com/<tenant>/discovery/v2.0/keys
 *   2. Verifikasi signature, `exp`, `iss`, dan `aud`  (pakai `jose`)
 *   3. Petakan claim `roles` dan `tid` ke bentuk VerifiedToken
 *
 * Bentuk kembaliannya wajib identik dengan StubTokenVerifier, sehingga
 * pergantian mode tidak menyentuh kode Gateway sama sekali.
 */
@Injectable()
export class EntraTokenVerifier implements TokenVerifier {
  async verify(_rawToken: string): Promise<VerifiedToken> {
    throw new UnauthorizedException(
      'EntraTokenVerifier belum diimplementasi — butuh kredensial Azure. Sementara pakai AUTH_MODE=stub.',
    )
  }
}
