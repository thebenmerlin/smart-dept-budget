import { sql } from './db';
import { headers } from 'next/headers';

export interface AuditLogEntry {
  userId: number | null;
  action: string;
  entityType: string;
  entityId?:  number;
  oldValues?: any;
  newValues?: any;
}

export async function createAuditLog(entry: AuditLogEntry): Promise<void> {
  try {
    const headersList = await headers();
    const ipAddress = headersList. get('x-forwarded-for') || headersList.get('x-real-ip') || 'unknown';
    const userAgent = headersList. get('user-agent') || 'unknown';

    await sql`
      INSERT INTO audit_logs (user_id, action, entity_type, entity_id, old_values, new_values, ip_address, user_agent)
      VALUES (
        ${entry.userId},
        ${entry.action},
        ${entry.entityType},
        ${entry.entityId || null},
        ${entry.oldValues ?  JSON.stringify(entry.oldValues) : null},
        ${entry.newValues ?  JSON.stringify(entry.newValues) : null},
        ${ipAddress},
        ${userAgent}
      )
    `;
  } catch (error) {
    console.error('Audit log error:', error);
    // Don't throw - audit logging should not break main functionality
  }
}

export async function getAuditLogs(filters: {
  userId?: number;
  entityType?: string;
  entityId?:  number;
  startDate?: string;
  endDate?: string;
  limit?: number;
  offset?: number;
}) {
  const { userId, entityType, entityId, startDate, endDate, limit = 50, offset = 0 } = filters;

  const logs = await sql`
    SELECT 
      al.*,
      u. name as user_name,
      u.email as user_email
    FROM audit_logs al
    LEFT JOIN users u ON u.id = al. user_id
    WHERE 1=1
      ${userId ? sql`AND al.user_id = ${userId}` : sql``}
      ${entityType ? sql`AND al.entity_type = ${entityType}` : sql``}
      ${entityId ? sql`AND al.entity_id = ${entityId}` : sql``}
      ${startDate ?  sql`AND al.created_at >= ${startDate}` : sql``}
      ${endDate ? sql`AND al.created_at <= ${endDate}` : sql``}
    ORDER BY al.created_at DESC
    LIMIT ${limit} OFFSET ${offset}
  `;

  return logs;
}