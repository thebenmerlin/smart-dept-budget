import { neon, neonConfig } from '@neondatabase/serverless';

neonConfig. fetchConnectionCache = true;

const databaseUrl = process. env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error('DATABASE_URL environment variable is not set');
}

export const sql = neon(databaseUrl);

// Type-safe query helper
export async function query<T = any>(
  strings: TemplateStringsArray,
  ...values: any[]
): Promise<T[]> {
  try {
    const result = await sql(strings, ...values);
    return result as T[];
  } catch (error) {
    console.error('Database query error:', error);
    throw error;
  }
}

// Transaction helper (for multiple related queries)
export async function transaction<T>(
  callback: (sql: typeof query) => Promise<T>
): Promise<T> {
  // Note:  Neon serverless doesn't support true transactions
  // For critical operations, consider using Neon's transaction support
  return callback(query);
}