import { relations } from 'drizzle-orm'
import {
  index,
  jsonb,
  numeric,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core'

/**
 * Satu baris per perusahaan klien. Seluruh isolasi data bertumpu pada tabel ini.
 *
 * `slug` adalah pengenal yang enak dibaca manusia ('tenant-a'), dipakai di
 * token dev. `entraTenantId` menampung claim `tid` dari Entra.
 * TODO(lead-dev): 1 klien = 1 Azure tenant, atau semua klien di 1 Azure tenant?
 */
export const tenants = pgTable(
  'tenants',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    slug: text('slug').notNull(),
    name: text('name').notNull(),
    entraTenantId: text('entra_tenant_id'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [uniqueIndex('tenants_slug_idx').on(t.slug)],
)

/**
 * User lokal. `entraSubject` adalah claim `sub` dari Entra — jembatan antara
 * identitas di Microsoft dan user di database kita.
 */
export const users = pgTable(
  'users',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    tenantId: uuid('tenant_id')
      .notNull()
      .references(() => tenants.id, { onDelete: 'cascade' }),
    entraSubject: text('entra_subject').notNull(),
    email: text('email'),
    name: text('name'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex('users_entra_subject_idx').on(t.entraSubject),
    index('users_tenant_idx').on(t.tenantId),
  ],
)

/**
 * Jurnal akuntansi.
 *
 * `amount` memakai numeric(19,4), BUKAN float. Drizzle mengembalikannya sebagai
 * string supaya presisi desimal tidak rusak. Jangan pernah parseFloat untuk
 * perhitungan uang — pakai library decimal.
 */
export const journalEntries = pgTable(
  'journal_entries',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    tenantId: uuid('tenant_id')
      .notNull()
      .references(() => tenants.id, { onDelete: 'cascade' }),
    reference: text('reference').notNull(),
    description: text('description').notNull(),
    amount: numeric('amount', { precision: 19, scale: 4 }).notNull(),
    status: text('status', { enum: ['DRAFT', 'POSTED', 'VOID'] }).notNull().default('DRAFT'),
    createdBy: uuid('created_by')
      .notNull()
      .references(() => users.id),
    approvedBy: uuid('approved_by').references(() => users.id),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index('journal_entries_tenant_idx').on(t.tenantId),
    uniqueIndex('journal_entries_tenant_reference_idx').on(t.tenantId, t.reference),
  ],
)

/**
 * Audit trail — BUKAN log aplikasi.
 *
 * Winston untuk debugging; tabel ini untuk kepatuhan. Append-only: tidak boleh
 * ada UPDATE maupun DELETE. Penegakannya ada di sql/rls.sql, yang hanya
 * memberikan hak INSERT dan SELECT kepada role aplikasi.
 */
export const auditLog = pgTable(
  'audit_log',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    tenantId: uuid('tenant_id')
      .notNull()
      .references(() => tenants.id, { onDelete: 'cascade' }),
    actorId: uuid('actor_id').references(() => users.id),
    action: text('action').notNull(),
    entityType: text('entity_type').notNull(),
    entityId: uuid('entity_id'),
    before: jsonb('before'),
    after: jsonb('after'),
    requestId: text('request_id'),
    at: timestamp('at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index('audit_log_tenant_idx').on(t.tenantId), index('audit_log_entity_idx').on(t.entityId)],
)

export const tenantsRelations = relations(tenants, ({ many }) => ({
  users: many(users),
  journalEntries: many(journalEntries),
}))

export const usersRelations = relations(users, ({ one }) => ({
  tenant: one(tenants, { fields: [users.tenantId], references: [tenants.id] }),
}))

export const journalEntriesRelations = relations(journalEntries, ({ one }) => ({
  tenant: one(tenants, { fields: [journalEntries.tenantId], references: [tenants.id] }),
  creator: one(users, { fields: [journalEntries.createdBy], references: [users.id] }),
}))
