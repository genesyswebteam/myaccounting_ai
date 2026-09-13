'use client'

import { subject } from '@casl/ability'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import type { AppAbility } from '@/lib/ability'
import type { JournalRow } from '@/lib/api'

/**
 * Format tampilan saja. Number() dipakai HANYA untuk merender —
 * jangan pernah untuk perhitungan uang, karena presisi desimalnya hilang.
 *
 * minimumFractionDigits wajib diisi: format IDR bawaan memakai NOL desimal,
 * sehingga 4250000.5000 akan tampil sebagai "Rp 4.250.001" — dibulatkan,
 * dan salah untuk laporan keuangan.
 */
const rupiah = (amount: string) =>
  new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Number(amount))

const statusVariant = {
  DRAFT: 'secondary',
  POSTED: 'default',
  VOID: 'destructive',
} as const

interface Props {
  journals: JournalRow[]
  ability: AppAbility
  currentUserId: string | null
  busyId: string | null
  onApprove: (id: string) => void
}

export function JournalTable({ journals, ability, currentUserId, busyId, onApprove }: Props) {
  if (journals.length === 0) {
    return (
      <p className="px-6 py-10 text-center text-sm text-muted-foreground">
        Tidak ada jurnal untuk tenant ini.
      </p>
    )
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Referensi</TableHead>
          <TableHead>Keterangan</TableHead>
          <TableHead className="text-right">Nilai</TableHead>
          <TableHead>Status</TableHead>
          <TableHead className="text-right">Aksi</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {journals.map((journal) => {
          // Subject yang sama persis bentuknya dengan yang dievaluasi backend.
          const target = subject('JournalEntry', {
            tenantId: journal.tenantId,
            status: journal.status,
            createdBy: journal.createdBy,
          })

          const allowed = ability.can('approve', target)
          const reason = ability.relevantRuleFor('approve', target)?.reason
          const mine = journal.createdBy === currentUserId

          return (
            <TableRow key={journal.id}>
              <TableCell className="font-mono text-xs">{journal.reference}</TableCell>
              <TableCell>
                <span>{journal.description}</span>
                {mine && (
                  <span className="ml-2 text-xs text-muted-foreground">(dibuat olehmu)</span>
                )}
              </TableCell>
              <TableCell className="text-right font-mono text-sm tabular-nums">
                {rupiah(journal.amount)}
              </TableCell>
              <TableCell>
                <Badge variant={statusVariant[journal.status]}>{journal.status}</Badge>
              </TableCell>
              <TableCell className="text-right">
                {journal.status !== 'DRAFT' ? (
                  <span className="text-xs text-muted-foreground">—</span>
                ) : allowed ? (
                  <Button
                    size="sm"
                    disabled={busyId === journal.id}
                    onClick={() => onApprove(journal.id)}
                  >
                    {busyId === journal.id ? 'Memproses…' : 'Approve'}
                  </Button>
                ) : (
                  // Tombol sengaja ditampilkan tapi mati, bukan dihilangkan —
                  // supaya alasan penolakannya terbaca. Di produksi, aksi yang
                  // tidak relevan sebaiknya disembunyikan sepenuhnya.
                  <div className="flex flex-col items-end gap-1">
                    <Button size="sm" variant="outline" disabled>
                      Approve
                    </Button>
                    <span className="max-w-[16rem] text-right text-xs text-muted-foreground">
                      {reason ?? 'Role kamu tidak punya izin approve'}
                    </span>
                  </div>
                )}
              </TableCell>
            </TableRow>
          )
        })}
      </TableBody>
    </Table>
  )
}
