import { NextResponse } from 'next/server';
import { sql } from '../../../../lib/db';

export async function GET() {
  const rows = await sql`
    select c.name as category, sum(e.amount) as total
    from expenses e
    join categories c on c.id = e.category_id
    group by c.name
    order by total desc;
  `;
  return NextResponse.json(rows);
}