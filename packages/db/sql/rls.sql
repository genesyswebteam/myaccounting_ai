-- ============================================================================
-- Row Level Security — benteng terakhir isolasi tenant.
--
-- Dua jebakan yang sering bikin RLS diam-diam tidak aktif:
--   1. SUPERUSER selalu menembus RLS, apa pun policy-nya.
--   2. PEMILIK TABEL juga menembus RLS, kecuali dipaksa FORCE ROW LEVEL SECURITY.
--
-- Karena itu aplikasi TIDAK BOLEH konek sebagai `interacc` (superuser & pemilik
-- tabel). Migrasi dijalankan sebagai `interacc`; runtime memakai `interacc_app`
-- yang NOSUPERUSER + NOBYPASSRLS.
-- ============================================================================

-- ---------------------------------------------------------------- app role --
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'interacc_app') THEN
    CREATE ROLE interacc_app LOGIN PASSWORD 'interacc_app' NOSUPERUSER NOBYPASSRLS NOCREATEDB NOCREATEROLE;
  END IF;
END
$$;

GRANT USAGE ON SCHEMA public TO interacc_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON tenants, users, journal_entries TO interacc_app;

-- audit_log sengaja TANPA update/delete: audit trail wajib append-only.
REVOKE ALL ON audit_log FROM interacc_app;
GRANT SELECT, INSERT ON audit_log TO interacc_app;

-- --------------------------------------------------- resolve identity (authn) --
-- Saat autentikasi, tenant context BELUM ada — jadi lookup ini mustahil lewat
-- RLS. SECURITY DEFINER menjalankannya sebagai pemilik fungsi, dengan cakupan
-- yang sengaja dipersempit: hanya menerjemahkan (subject, slug) -> (user, tenant).
CREATE OR REPLACE FUNCTION resolve_identity(p_subject text, p_tenant_slug text)
RETURNS TABLE (user_id uuid, tenant_id uuid)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT u.id, t.id
  FROM tenants t
  JOIN users u ON u.tenant_id = t.id
  WHERE t.slug = p_tenant_slug
    AND u.entra_subject = p_subject
$$;

REVOKE ALL ON FUNCTION resolve_identity(text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION resolve_identity(text, text) TO interacc_app;

-- ----------------------------------------------------------------- policies --
-- current_setting(..., true) mengembalikan NULL kalau app.tenant_id belum diset.
-- Perbandingan dengan NULL menghasilkan NULL -> baris ditolak. Gagal secara
-- tertutup: lupa menyetel tenant berarti tidak dapat data, bukan dapat semua.
-- NULLIF menjaga string kosong tidak dilempar ke cast uuid.

ALTER TABLE tenants          ENABLE ROW LEVEL SECURITY;
ALTER TABLE tenants          FORCE  ROW LEVEL SECURITY;
ALTER TABLE users            ENABLE ROW LEVEL SECURITY;
ALTER TABLE users            FORCE  ROW LEVEL SECURITY;
ALTER TABLE journal_entries  ENABLE ROW LEVEL SECURITY;
ALTER TABLE journal_entries  FORCE  ROW LEVEL SECURITY;
ALTER TABLE audit_log        ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_log        FORCE  ROW LEVEL SECURITY;

DROP POLICY IF EXISTS tenant_isolation ON tenants;
CREATE POLICY tenant_isolation ON tenants
  USING (id = NULLIF(current_setting('app.tenant_id', true), '')::uuid);

DROP POLICY IF EXISTS tenant_isolation ON users;
CREATE POLICY tenant_isolation ON users
  USING      (tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid)
  WITH CHECK (tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid);

DROP POLICY IF EXISTS tenant_isolation ON journal_entries;
CREATE POLICY tenant_isolation ON journal_entries
  USING      (tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid)
  WITH CHECK (tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid);

DROP POLICY IF EXISTS tenant_isolation ON audit_log;
CREATE POLICY tenant_isolation ON audit_log
  USING      (tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid)
  WITH CHECK (tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid);

-- ------------------------------------------------------- helper untuk demo --
-- Hanya dipakai script demo RLS: mendaftar tenant sebelum context ada.
-- Tidak dipakai kode aplikasi.
CREATE OR REPLACE FUNCTION resolve_tenants_for_demo()
RETURNS TABLE (id uuid, slug text)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT t.id, t.slug FROM tenants t ORDER BY t.slug
$$;

REVOKE ALL ON FUNCTION resolve_tenants_for_demo() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION resolve_tenants_for_demo() TO interacc_app;
