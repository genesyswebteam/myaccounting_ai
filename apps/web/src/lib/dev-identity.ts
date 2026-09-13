import type { Role } from '@interacc/shared-types'

/**
 * Identitas untuk development. Selama AUTH_MODE=stub, "login" cukup berarti
 * memilih salah satu dari daftar ini.
 *
 * Saat Entra aktif, seluruh berkas ini dibuang: identitas datang dari token
 * Microsoft, bukan dari dropdown.
 */
export interface DevIdentity {
  id: string
  label: string
  subject: string
  tenantSlug: string
  tenantName: string
  role: Role
}

export const DEV_IDENTITIES: DevIdentity[] = [
  {
    id: 'budi-accountant',
    label: 'Budi — Accountant',
    subject: 'budi',
    tenantSlug: 'tenant-a',
    tenantName: 'PT Maju Bersama',
    role: 'Accountant',
  },
  {
    id: 'budi-finance',
    label: 'Budi — Finance',
    subject: 'budi',
    tenantSlug: 'tenant-a',
    tenantName: 'PT Maju Bersama',
    role: 'Finance',
  },
  {
    id: 'sari-finance',
    label: 'Sari — Finance',
    subject: 'sari',
    tenantSlug: 'tenant-a',
    tenantName: 'PT Maju Bersama',
    role: 'Finance',
  },
  {
    id: 'dewi-accountant',
    label: 'Dewi — Accountant',
    subject: 'dewi',
    tenantSlug: 'tenant-b',
    tenantName: 'PT Sinar Abadi',
    role: 'Accountant',
  },
]

export function tokenFor(identity: DevIdentity): string {
  return `stub:${identity.subject}:${identity.tenantSlug}:${identity.role}`
}
