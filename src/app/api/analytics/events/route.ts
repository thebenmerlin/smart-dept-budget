import { NextResponse } from 'next/server';
import { sql } from '../../../../lib/db';

export async function GET() {
  const rows = await sql`
    select ev.name as event, coalesce(sum(e.amount),0) as total
    from activity_events ev
    left join expenses e on e.event_id = ev.id
    group by ev.name
    order by total desc;
  `;
  return NextResponse.json(rows);
}