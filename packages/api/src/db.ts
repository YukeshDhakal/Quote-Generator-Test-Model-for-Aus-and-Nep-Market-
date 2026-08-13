import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Pool, type PoolClient } from 'pg';

const __dirname = dirname(fileURLToPath(import.meta.url));

// Without an explicit `ssl` option, `pg` connects in plaintext unless the connection string
// itself carries `sslmode=require` - confirmed live (`pg_stat_ssl` showed `ssl:false`) that the
// DATABASE_URL in use here does not. `rejectUnauthorized: true` alone then fails ("self-signed
// certificate in certificate chain") because Supabase's pooler presents a cert signed by their
// own private CA ("Supabase Intermediate 2021 CA"), which isn't in Node's default trust store -
// this is Supabase's real, legitimate certificate infrastructure, not a spoofed cert. The fix is
// to trust that specific CA explicitly (pinned below) rather than disabling validation
// (`rejectUnauthorized: false`), which would encrypt the connection but not authenticate the
// server, leaving it open to an active MITM. The bundle was extracted directly from a live
// connection's TLS handshake (leaf cert dropped, intermediate + root kept) since Supabase's CA
// isn't otherwise bundled with `pg`/Node.
const supabaseCaBundle = readFileSync(join(__dirname, 'supabase-ca-bundle.pem'), 'utf8');

export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 5,
  idleTimeoutMillis: 30_000,
  ssl: { rejectUnauthorized: true, ca: supabaseCaBundle },
});

process.on('SIGTERM', () => {
  void pool.end();
});

/** Runs fn inside a single Postgres transaction on one checked-out client; auto BEGIN/COMMIT/ROLLBACK/release. */
export async function withTransaction<T>(fn: (client: PoolClient) => Promise<T>): Promise<T> {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await fn(client);
    await client.query('COMMIT');
    return result;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}
