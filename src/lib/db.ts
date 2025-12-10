import { neon, neonConfig } from '@neondatabase/serverless';

// Use WebSocket for Vercel Edge if needed
neonConfig.fetchConnectionCache = true;

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  throw new Error('DATABASE_URL is not set');
}

export const sql = neon(databaseUrl);

// helper to run inside transactions if needed
export async function withTransaction<T>(fn: (tx: typeof sql) => Promise<T>) {
  // neon serverless does not support BEGIN/COMMIT as in pooled; emulate with single connection
  // if transactional consistency is required, consider using `postgres` package with `sql.begin`
  return fn(sql);
}