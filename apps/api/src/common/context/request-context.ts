import { AsyncLocalStorage } from 'node:async_hooks'
import type { RequestContext } from '@interacc/shared-types'

/**
 * Konteks satu request disimpan di AsyncLocalStorage, bukan dioper manual
 * lewat parameter. Efeknya: logger dan module mana pun bisa baca requestId /
 * tenantId tanpa harus menerima `ctx` sebagai argumen di setiap fungsi.
 */
export const requestContextStorage = new AsyncLocalStorage<RequestContext>()

export function getRequestContext(): RequestContext | undefined {
  return requestContextStorage.getStore()
}

/**
 * Dipakai auth guard untuk mengisi identitas setelah token terverifikasi.
 * Objek di store dimutasi supaya perubahan terlihat oleh seluruh rantai async
 * yang sedang berjalan di request yang sama.
 */
export function setIdentity(patch: Partial<RequestContext>): void {
  const ctx = requestContextStorage.getStore()
  if (ctx) Object.assign(ctx, patch)
}
