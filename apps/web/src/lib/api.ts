import type { RawRuleOf } from '@casl/ability'
import type { AppAbility } from './ability'

const BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000'

export interface JournalRow {
  id: string
  tenantId: string
  reference: string
  description: string
  amount: string
  status: 'DRAFT' | 'POSTED' | 'VOID'
  createdBy: string
  approvedBy: string | null
  createdAt: string
}

export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message)
  }
}

async function request<T>(path: string, token: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    ...init,
    headers: { ...init?.headers, Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    cache: 'no-store',
  })

  const body = await res.json().catch(() => null)
  if (!res.ok) {
    throw new ApiError(body?.message ?? `Request gagal (${res.status})`, res.status)
  }
  return body as T
}

export const api = {
  journals: (token: string) => request<JournalRow[]>('/journals', token),

  approve: (token: string, id: string) =>
    request<JournalRow>(`/journals/${id}/approve`, token, { method: 'POST' }),

  /**
   * Mengambil aturan CASL milik user dari backend.
   * Aturannya TIDAK ditulis ulang di sini — frontend hanya merehidrasi definisi
   * yang sama persis dengan yang dipakai backend saat menolak/mengizinkan.
   */
  abilities: (token: string) =>
    request<{ roles: string[]; rules: RawRuleOf<AppAbility>[] }>('/rbac/abilities', token),

  me: (token: string) =>
    request<{ userId: string; tenantId: string; roles: string[] }>('/auth/me', token),
}
