'use client'

import { useCallback, useEffect, useState } from 'react'
import { AlertCircle, Building2, RefreshCw } from 'lucide-react'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Separator } from '@/components/ui/separator'
import { JournalTable } from '@/components/journal-table'
import { buildAbility, type AppAbility } from '@/lib/ability'
import { api, type JournalRow } from '@/lib/api'
import { DEV_IDENTITIES, tokenFor } from '@/lib/dev-identity'

export default function Page() {
  const [identityId, setIdentityId] = useState(DEV_IDENTITIES[0]!.id)
  const [journals, setJournals] = useState<JournalRow[]>([])
  const [ability, setAbility] = useState<AppAbility | null>(null)
  const [userId, setUserId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [busyId, setBusyId] = useState<string | null>(null)

  const identity = DEV_IDENTITIES.find((i) => i.id === identityId)!
  const token = tokenFor(identity)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      // Aturan izin diambil dari backend, tidak ditulis ulang di frontend.
      const [rows, abilities, me] = await Promise.all([
        api.journals(token),
        api.abilities(token),
        api.me(token),
      ])
      setJournals(rows)
      setAbility(buildAbility(abilities.rules))
      setUserId(me.userId)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal memuat data')
      setJournals([])
      setAbility(null)
    } finally {
      setLoading(false)
    }
  }, [token])

  useEffect(() => {
    void load()
  }, [load])

  async function handleApprove(id: string) {
    setBusyId(id)
    setError(null)
    try {
      await api.approve(token, id)
      await load()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Approve gagal')
    } finally {
      setBusyId(null)
    }
  }

  return (
    <main className="mx-auto max-w-5xl px-6 py-10">
      <header className="mb-8">
        <h1 className="text-2xl font-semibold tracking-tight">INTERACC</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          SaaS Accounting — multi-tenant. Task-001: kerangka monorepo.
        </p>
      </header>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="text-base">Masuk sebagai</CardTitle>
          <CardDescription>
            Selama <code className="font-mono text-xs">AUTH_MODE=stub</code>, login berarti memilih
            identitas. Saat Entra aktif, dropdown ini diganti halaman login Microsoft.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap items-center gap-3">
            <Select value={identityId} onValueChange={(v) => v && setIdentityId(v)}>
              <SelectTrigger className="w-[260px]">
                {/* Base UI merender nilai mentah; petakan sendiri ke labelnya. */}
                <SelectValue>
                  {(value: string) =>
                    DEV_IDENTITIES.find((i) => i.id === value)?.label ?? value
                  }
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {DEV_IDENTITIES.map((i) => (
                  <SelectItem key={i.id} value={i.id}>
                    {i.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Badge variant="secondary" className="gap-1.5">
              <Building2 className="size-3" />
              {identity.tenantName}
            </Badge>

            <Button variant="ghost" size="sm" onClick={() => void load()} disabled={loading}>
              <RefreshCw className={`size-3.5 ${loading ? 'animate-spin' : ''}`} />
              Muat ulang
            </Button>
          </div>

          <Separator className="my-4" />

          <p className="text-xs text-muted-foreground">
            Token yang dikirim:{' '}
            <code className="rounded bg-muted px-1.5 py-0.5 font-mono">{token}</code>
          </p>
        </CardContent>
      </Card>

      {error && (
        <Alert variant="destructive" className="mb-6">
          <AlertCircle className="size-4" />
          <AlertTitle>Ditolak backend</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <Card className="overflow-hidden">
        <CardHeader>
          <CardTitle className="text-base">Jurnal</CardTitle>
          <CardDescription>
            Query di backend sengaja tidak memakai <code className="font-mono text-xs">WHERE tenant_id</code>{' '}
            — Postgres RLS yang menyaring. Ganti identitas ke tenant lain untuk melihat datanya berubah.
          </CardDescription>
        </CardHeader>
        <CardContent className="px-0">
          {loading ? (
            <p className="px-6 py-10 text-center text-sm text-muted-foreground">Memuat…</p>
          ) : ability ? (
            <JournalTable
              journals={journals}
              ability={ability}
              currentUserId={userId}
              busyId={busyId}
              onApprove={(id) => void handleApprove(id)}
            />
          ) : null}
        </CardContent>
      </Card>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle className="text-base">Pembagian tanggung jawab</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          {[
            ['Entra', 'Kamu siapa?', 'stub — menunggu kredensial Azure'],
            ['Gateway', 'Token valid? tenant mana?', 'verify, resolve tenant, requestId'],
            ['CASL', 'Boleh ngapain?', 'aturan yang sama dipakai halaman ini'],
            ['Postgres RLS', 'Baris ini milik tenant ini?', 'benteng terakhir, di database'],
          ].map(([layer, question, note]) => (
            <div key={layer} className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
              <span className="w-28 shrink-0 font-medium">{layer}</span>
              <span className="text-muted-foreground">{question}</span>
              <span className="text-xs text-muted-foreground/70">— {note}</span>
            </div>
          ))}
        </CardContent>
      </Card>
    </main>
  )
}
