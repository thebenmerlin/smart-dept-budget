import { NextResponse } from 'next/server';
import { sql } from '../../../../lib/db';
import { getCurrentUser } from '../../../../lib/auth';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const rows = await sql`
      select ev.name as event, coalesce(sum(e.amount),0) as total
      from activity_events ev
      left join expenses e on e.event_id = ev.id and e.department_id = ${user.department_id}
      group by ev.name
      order by total desc;
    `;
    return NextResponse.json(rows);
  } catch (error) {
    console.error('Events analytics error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}