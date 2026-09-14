/**
 * Role kasar yang datang dari Entra (App Roles claim).
 * Permission detail TIDAK ada di sini — itu urusan RBAC/CASL.
 *
 * TODO(lead-dev): konfirmasi role disimpan di Entra App Roles atau tabel DB kita.
 */
export const ROLES = ['Admin', 'Finance', 'Accountant', 'User', 'External'] as const
export type Role = (typeof ROLES)[number]

/**
 * Hasil verifikasi token — bentuknya sama, apa pun verifier-nya (stub / Entra).
 * Inilah kontrak yang bikin verifier bisa ditukar.
 */
export interface VerifiedToken {
  /** `sub` dari Entra — id user di sisi identity provider */
  subject: string
  email?: string
  name?: string
  roles: Role[]
  /** claim `tid` dari Entra. TODO(lead-dev): ini sumber tenant kita atau mapping sendiri? */
  entraTenantId?: string
}

/** Konteks yang dibawa sepanjang satu request. Diisi Gateway, dibaca semua module. */
export interface RequestContext {
  requestId: string
  /** id user di DB kita (bukan `sub` Entra) */
  userId?: string
  /** id tenant di DB kita — dasar semua isolasi data */
  tenantId?: string
  roles: Role[]
}

export interface HealthResponse {
  status: 'ok'
  module: string
  timestamp: string
}
