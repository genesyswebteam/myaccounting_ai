import type { VerifiedToken } from '@interacc/shared-types'

/**
 * Satu-satunya kontrak yang dipakai Gateway. Implementasinya bisa ditukar
 * (stub saat dev, Entra saat kredensial Azure sudah ada) tanpa mengubah
 * satu baris pun di guard.
 */
export interface TokenVerifier {
  verify(rawToken: string): Promise<VerifiedToken>
}

export const TOKEN_VERIFIER = Symbol('TOKEN_VERIFIER')
