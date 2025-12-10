import { sql } from './db';
import { getServerSession } from 'next-auth';
import { authOptions } from './auth';

export async function logAudit(action: string, entity: string, payload: any) {
  const session = await getServerSession(authOptions);
  const userId = session?.user?.id ?? null;
  await sql`
    insert into audit_logs (user_id, action, entity, payload)
    values (${userId}, ${action}, ${entity}, ${payload ? JSON.stringify(payload) : null});
  `;
}