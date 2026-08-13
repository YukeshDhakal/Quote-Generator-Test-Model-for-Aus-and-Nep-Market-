// One-off data migration: reads a downloaded copy of the production SQLite database (read-only)
// and writes every row into Postgres (Supabase). Not part of the running app - run manually.
//
// Usage:
//   DATABASE_URL=postgres://... node scripts/migrate-to-postgres.mjs ./backup/quote-engine-<date>.db
//
// Rehearse against quoteengine-dev (with a copy of real or synthetic data) before running for
// real against quoteengine-prod. Safe to re-run: uses ON CONFLICT DO NOTHING on primary keys.

import { DatabaseSync } from 'node:sqlite';
import pg from 'pg';

const dbPath = process.argv[2];
if (!dbPath) {
  console.error('Usage: DATABASE_URL=postgres://... node scripts/migrate-to-postgres.mjs <path-to-sqlite-backup.db>');
  process.exit(1);
}
if (!process.env.DATABASE_URL) {
  console.error('DATABASE_URL env var is required (the target Postgres connection string).');
  process.exit(1);
}

const sqlite = new DatabaseSync(dbPath, { readOnly: true });
const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });

// FK-safe dependency order - must match this exactly.
const TABLES = ['users', 'businesses', 'business_settings', 'requests', 'quotes', 'line_items', 'quote_number_counters'];

async function migrateTable(name, rowMapper) {
  const rows = sqlite.prepare(`SELECT * FROM ${name}`).all();
  if (rows.length === 0) {
    console.log(`${name}: 0 rows, skipping`);
    return 0;
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    for (const row of rows) {
      const mapped = rowMapper ? rowMapper(row) : row;
      const cols = Object.keys(mapped);
      const placeholders = cols.map((_, i) => `$${i + 1}`).join(', ');
      await client.query(
        `INSERT INTO ${name} (${cols.join(', ')}) VALUES (${placeholders}) ON CONFLICT DO NOTHING`,
        cols.map((c) => mapped[c]),
      );
    }
    await client.query('COMMIT');
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
  console.log(`${name}: migrated ${rows.length} rows`);
  return rows.length;
}

// line_items needs taxable 0/1 -> boolean; everything else is a 1:1 column copy (all IDs are
// already app-generated UUIDs, no rowid/autoincrement dependency to worry about).
await migrateTable('users');
await migrateTable('businesses');
await migrateTable('business_settings');
await migrateTable('requests');
await migrateTable('quotes');
await migrateTable('line_items', (row) => ({ ...row, taxable: Boolean(row.taxable) }));
await migrateTable('quote_number_counters');

console.log('\nVerifying row counts...');
let allMatch = true;
for (const table of TABLES) {
  const sqliteCount = sqlite.prepare(`SELECT COUNT(*) as c FROM ${table}`).get().c;
  const { rows } = await pool.query(`SELECT COUNT(*) as c FROM ${table}`);
  const pgCount = Number(rows[0].c);
  const ok = sqliteCount === pgCount;
  if (!ok) allMatch = false;
  console.log(`${table}: sqlite=${sqliteCount} pg=${pgCount} ${ok ? 'OK' : 'MISMATCH!!'}`);
}

await pool.end();
sqlite.close();

if (!allMatch) {
  console.error('\nRow count mismatch detected - do not proceed to cutover until this is understood.');
  process.exit(1);
}
console.log('\nAll row counts match.');
