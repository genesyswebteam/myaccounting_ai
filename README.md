# INTERACC — SaaS Accounting

Monorepo multi-tenant. **Task-001: Setup Monorepo** (deadline 14 Sep).

## Jalanin

```bash
pnpm install
cp .env.example .env
docker compose up -d          # Postgres (butuh Docker Desktop nyala)
pnpm build
pnpm db:migrate               # tabel + RLS policy + role aplikasi
pnpm db:seed                  # 2 tenant, 3 user, 3 jurnal
pnpm dev
```

Web di `http://localhost:3000`, API di `http://localhost:4000`.

## Bukti RLS dalam 5 detik

```bash
pnpm db:demo-rls
```

Menjalankan query yang **sama persis** tanpa `WHERE tenant_id` sebanyak tiga kali —
tanpa tenant context, lalu sebagai tenant-a, lalu tenant-b — dan menunjukkan
hasilnya berbeda. Ditutup dengan percobaan insert lintas tenant dan percobaan
mengubah audit trail, keduanya harus ditolak database.

## Struktur

```
apps/
  web/                        Next.js 16 + shadcn/ui
  api/                        NestJS — SATU app, empat module
    src/modules/
      gateway/                verify token, resolve tenant, requestId, access log
      auth-access/            integrasi Entra (verifier bisa ditukar)
      rbac/                   CASL ability factory
      accounting/             domain akuntansi
packages/
  db/                         Drizzle schema, migration, RLS policy, seed
  shared-types/               kontrak yang dipakai bersama api & web
  config/                     tsconfig base
```

## Dua koneksi database, sengaja dipisah

| Koneksi | User | Dipakai | RLS |
|---|---|---|---|
| `DATABASE_URL` | `interacc` | migrasi & seed | **ditembus** (superuser) |
| `DATABASE_APP_URL` | `interacc_app` | runtime aplikasi | **berlaku** |

Ini bukan kerumitan yang tidak perlu. Superuser **dan** pemilik tabel menembus
RLS secara default — kalau aplikasi konek sebagai `interacc`, semua policy jadi
hiasan yang diam-diam tidak aktif. Tabel juga di-`FORCE ROW LEVEL SECURITY`
supaya pemiliknya sendiri ikut tunduk.

**Modular monolith**: satu proses, batas module tegas. Kalau nanti dipecah jadi
microservices, tiap folder module bisa diangkat keluar tanpa membongkar yang lain.

## Auth saat development

Kredensial Azure belum ada, jadi `AUTH_MODE=stub`. Format token:

```
stub:<user>:<tenant>:<role,role>
```

Role yang dikenal: `Admin` `Finance` `Accountant` `User` `External`.

`EntraTokenVerifier` memakai interface yang sama persis — begitu kredensial
turun, cukup ubah `AUTH_MODE=entra`, tidak ada kode Gateway yang tersentuh.
Bootstrap menolak jalan kalau `NODE_ENV=production` tapi mode masih stub.

## Coba sendiri

```bash
# publik
curl localhost:4000/health

# tanpa token -> 401
curl localhost:4000/journals

# tenant-a cuma lihat data tenant-a
curl localhost:4000/journals -H "Authorization: Bearer stub:budi:tenant-a:Accountant"

# tenant-b cuma lihat data tenant-b
curl localhost:4000/journals -H "Authorization: Bearer stub:dewi:tenant-b:Accountant"

# ambil id jurnal DRAFT milik tenant-a
JE=$(curl -s localhost:4000/journals \
  -H "Authorization: Bearer stub:budi:tenant-a:Accountant" \
  | python3 -c "import json,sys; print(json.load(sys.stdin)[0]['id'])")

# Budi punya role Finance (boleh approve), TAPI jurnal itu buatan dia sendiri -> 403
curl -X POST localhost:4000/journals/$JE/approve \
  -H "Authorization: Bearer stub:budi:tenant-a:Finance"

# Sari role Finance, jurnal buatan orang lain -> boleh
curl -X POST localhost:4000/journals/$JE/approve \
  -H "Authorization: Bearer stub:sari:tenant-a:Finance"

# rule CASL yang nanti dikonsumsi frontend
curl localhost:4000/rbac/abilities -H "Authorization: Bearer stub:sari:tenant-a:Finance"
```

## Halaman web

Satu halaman yang menampilkan seluruh arsitektur sekaligus:

- **Ganti identitas** di dropdown — selama `AUTH_MODE=stub`, itulah "login".
  Pilih Dewi untuk melihat data tenant berganti total (RLS).
- **Tombol Approve** dinyalakan/dimatikan oleh CASL, memakai aturan yang
  **diambil dari backend** lewat `GET /rbac/abilities` — bukan ditulis ulang
  di frontend. Alasan penolakan ikut ditampilkan.
- Pilih *Budi — Finance*: role-nya punya izin approve, tapi tombolnya tetap
  mati untuk jurnal buatan Budi sendiri (segregation of duties).

Penyembunyian tombol di frontend murni kosmetik — penegakan tetap di backend.

### Catatan implementasi

- `@casl/react` **tidak dipakai**: versi 4 belum mendukung React 19 (Next 16
  memakai React 19.2). Paket itu hanya wrapper tipis; `@casl/ability` yang
  mengerjakan seluruh logikanya bersifat framework-agnostic dan dipakai langsung.
- Format rupiah **wajib** menyetel `minimumFractionDigits: 2`. Format IDR bawaan
  memakai nol desimal, sehingga `4250000.5000` tampil sebagai `Rp 4.250.001` —
  dibulatkan, dan salah untuk laporan keuangan.

## Pembagian tanggung jawab

| Lapisan | Pertanyaan | Status |
|---|---|---|
| Entra | Kamu siapa? | stub (nunggu kredensial Azure) |
| Gateway | Token valid? tenant mana? | ✅ jalan |
| CASL | Boleh ngapain? | ✅ jalan |
| Postgres RLS | Baris ini milik tenant ini? | ✅ jalan |

Entra hanya menerbitkan label role. Semua keputusan boleh/tidak dibuat CASL,
karena Entra tidak mengenal jurnal, tenant, maupun status dokumen.

## Belum dikerjakan

- [ ] `EntraTokenVerifier` — verifikasi JWKS (butuh kredensial Azure)
- [ ] Provisioning otomatis saat user Entra login pertama kali
- [ ] Chart of accounts, jurnal double-entry, laporan — **ini task berikutnya**

## Nunggu jawaban lead dev

Semua sudah jalan pakai asumsi sementara. Kalau jawabannya beda, tidak ada
kerjaan yang terbuang — hanya perlu penyesuaian di titik yang ditandai `TODO(lead-dev)`.

1. **1 NestJS app dengan 4 module, atau 4 app terpisah?** → diasumsikan 1 app (diagram: "Modular Monolith — initial approach")
2. **Strategi multi-tenant?** → diasumsikan shared DB + `tenant_id` + RLS
3. **`tenantId` dari claim `tid` Entra atau mapping sendiri?** → sementara dari claim
4. **Role di Entra App Roles atau tabel DB?** → sementara dari token, hybrid
5. Repo di GitHub atau Azure DevOps?
6. Sudah ada akses tenant Azure untuk dev?
7. Confirm ORM Drizzle? (tidak tertulis di diagram)

## Catatan

- **Uang**: `numeric(19,4)`, dikembalikan sebagai **string**. Jangan `parseFloat` untuk hitungan uang.
- **Audit trail ≠ log aplikasi**: Winston untuk debugging; audit trail wajib tabel DB append-only.
