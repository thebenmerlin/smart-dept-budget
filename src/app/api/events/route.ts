import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';
import { createAuditLog } from '@/lib/audit';
import { z } from 'zod';

const eventSchema = z. object({
  name: z.string().min(1).max(255),
  event_type: z. string().max(100).optional(),
  start_date: z. string().optional(),
  end_date:  z.string().optional(),
  description: z.string().optional(),
});

// GET - List events
export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json(
        { success:  false, error: 'Unauthorized' },
        { status:  401 }
      );
    }

    const events = await sql`
      SELECT 
        ae.*,
        COALESCE(SUM(CASE WHEN e.status = 'approved' THEN e.amount ELSE 0 END), 0) as total_spending,
        COUNT(e.id) as expense_count
      FROM activity_events ae
      LEFT JOIN expenses e ON e.event_id = ae. id
      WHERE ae. department_id = ${user.department_id}
      GROUP BY ae.id
      ORDER BY ae. start_date DESC NULLS LAST, ae.name
    `;

    return NextResponse.json({
      success: true,
      data:  events. map((e) => ({
        ... e,
        total_spending: Number(e.total_spending),
      })),
    });
  } catch (error) {
    console.error('Events GET API error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST - Create event
export async function POST(request:  NextRequest) {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse. json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request. json();
    const validation = eventSchema. safeParse(body);

    if (!validation.success) {
      return NextResponse. json(
        { success: false, error: validation.error. errors. map((e) => e.message).join(', ') },
        { status: 400 }
      );
    }

    const { name, event_type, start_date, end_date, description } = validation.data;

    const result = await sql`
      INSERT INTO activity_events (department_id, name, event_type, start_date, end_date, description)
      VALUES (${user.department_id}, ${name}, ${event_type || null}, ${start_date || null}, ${end_date || null}, ${description || null})
      RETURNING *
    `;

    await createAuditLog({
      userId:  user.id,
      action: 'CREATE_EVENT',
      entityType: 'activity_event',
      entityId: result[0].id,
      newValues: validation.data,
    });

    return NextResponse.json({
      success: true,
      data: result[0],
    });
  } catch (error) {
    console.error('Events POST API error:', error);
    return NextResponse.json(
      { success:  false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}